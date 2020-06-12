import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as SignalR from "@aspnet/signalr";
import { ReceivedModel } from "./ReceivedModel";

export class BedlamPlayer implements ComponentFramework.StandardControl<IInputs, IOutputs> {

	private _receivedMessage: ReceivedModel;
	private _notifyOutputChanged: () => void;
	private _context: ComponentFramework.Context<IInputs>;
	private connection: signalR.HubConnection;
	private _signalRApi: string;

	/**
	 * Empty constructor.
	 */
	constructor() {

	}

	/**
	 * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
	 * Data-set values are not initialized here, use updateView.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
	 * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
	 * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
	 * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
	 */
	public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement) {
		// Add control initialization code
		this._context = context;
		this._notifyOutputChanged = notifyOutputChanged;
		this._signalRApi = context.parameters.signalRHubConnectionUrl.raw ?
			context.parameters.signalRHubConnectionUrl.raw : "";

		if (this._signalRApi) {
			//Create the connection to SignalR Hub
			this.OpenConnection();
		}
	}

	private OpenConnection() {
		this.connection = new SignalR.HubConnectionBuilder()
			.withUrl(this._signalRApi)
			.configureLogging(SignalR.LogLevel.Information) // for debug
			.build();

		//configure the event when a new message arrives
		this.connection.on("newMessage", (message: ReceivedModel) => {
			this._receivedMessage = message;
			this._notifyOutputChanged();
		});

		//connect
		this.connection.start()
			.catch(err => console.log(err));
	}

	/**
	 * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
	 */
	public updateView(context: ComponentFramework.Context<IInputs>): void {
		// Add code to update control view
		//When the MessageToSend is updated this code will run and we send the message to signalR
		this._context = context;

		if (context.parameters.signalRHubConnectionUrl.raw &&
				context.parameters.signalRHubConnectionUrl.raw !=
				this._signalRApi) {
					this._signalRApi = context.parameters.signalRHubConnectionUrl.raw;
					this.OpenConnection();
				}

		let messageToSend = JSON.parse(this._context.parameters.messageToSend.raw != null ?
			this._context.parameters.messageToSend.raw : "");
		this.httpCall(messageToSend, (res) => { console.log(res) });
	}

	/** 
	 * It is called by the framework prior to a control receiving new data. 
	 * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
	 */
	public getOutputs(): IOutputs {
		//This code will run when we call notifyOutputChanged when we receive a new message
		//here is where the message gets exposed to outside
		return {
			messageReceivedText: this._receivedMessage.text,
			messageReceivedType: this._receivedMessage.type,
			messageReceivedSender: this._receivedMessage.sender
		};
	}

	public httpCall(data: any, callback: (result: any) => any): void {
		var xhr = new XMLHttpRequest();
		xhr.open("post", this._signalRApi + "/messages", true);
		if (data != null) {
			xhr.setRequestHeader('Content-Type', 'application/json');
			xhr.send(JSON.stringify(data));
		}
		else xhr.send();
	}

	/** 
	 * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
	 * i.e. cancelling any pending remote calls, removing listeners, etc.
	 */
	public destroy(): void {
		// Add code to cleanup control if necessary
		this.connection.stop();
	}
}