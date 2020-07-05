import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { IBedlamMessage } from "./IBedlamMessage";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { v4 as NewGuid } from 'uuid';

export class BedlamPlayer implements ComponentFramework.StandardControl<IInputs, IOutputs> {

	private _message: IBedlamMessage;
	private _notifyOutputChanged: () => void;
	private _context: ComponentFramework.Context<IInputs>;
	private _connection?: signalR.HubConnection;
	private _signalRApi: string;
	private _userId: string | null;
	lastId: string;

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

		const innerDiv = document.createElement("div");
		innerDiv.style.backgroundColor = "#663399";
		innerDiv.style.border = "2px solid black";
		innerDiv.style.borderRadius = "10px"
		innerDiv.style.height = "100%";
		innerDiv.style.width = "100%";
		container.appendChild(innerDiv)
	}

	private OpenConnection() {
		this._connection = new HubConnectionBuilder()
			.withUrl(this._signalRApi)
			.configureLogging(LogLevel.Information) // for debug
			.withAutomaticReconnect()
			.build();

		//configure the event when a new message arrives
		this._connection.on("newMessage", this.processNewMessage.bind(this));

		//connect
		this._connection.start()
			.catch(err => { console.log(err); this._connection!.stop(); });
	}

	/**
	 * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
	 */
	public updateView(context: ComponentFramework.Context<IInputs>): void {
		if (context.updatedProperties.length > 0) {
			this._context = context;
			this._userId = context.parameters.userID.raw;

			if (context.parameters.sendMessage.raw == "true"
				&& context.parameters.messageData.raw
				&& context.parameters.userID.raw) {
				this.sendMessage(context);
			}

			if (context.parameters.signalRHubConnectionUrl.raw &&
				context.parameters.signalRHubConnectionUrl.raw !=
				this._signalRApi) {
				this._signalRApi = context.parameters.signalRHubConnectionUrl.raw;
				this.OpenConnection();
			}
		}
	}

	private sendMessage(context: ComponentFramework.Context<IInputs>) {
		this.lastId = NewGuid();
		let msg: IBedlamMessage = {
			messageID: this.lastId,
			type: context.parameters.messageType.raw,
			sender: context.parameters.userID.raw!,
			recipient: context.parameters.recipientID.raw!
		};

		switch (msg.type) {
			case 'add-user':
			case 'remove-user':
			case 'ack-user':
				msg.userId = context.parameters.messageData.raw!;
				break;
			case 'new-card':
			case 'played-card':
				msg.cardId =
					context.parameters.messageData.raw!
						.split(',')
						.map(val => Number.parseInt(val));
		}

		this.httpCall(msg);
	}

	/** 
	 * It is called by the framework prior to a control receiving new data. 
	 * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
	 */
	public getOutputs(): IOutputs {
		//This code will run when we call notifyOutputChanged when we receive a new message
		let output: IOutputs = {
			messageReceivedType: this._message.type,
			messageReceivedSender: this._message.sender
		}

		switch (this._message.type) {
			case 'add-user':
			case 'remove-user':
				output.messageReceivedData = this._message.userId;
				break;
			case 'new-card':
			case 'played-card':
			case 'next-card':
			case 'prev-card':
			case 'fave-card':
			case 'unfave-card':
			case 'choose-winner':
				output.messageReceivedData = this._message.cardId?.toString();
		}

		return output;
	}

	private processNewMessage(message: IBedlamMessage): void {
		this._message = message;
		if (this.lastId != message.messageID
			&& this._context.parameters.userID.raw == message.recipient
		) {
			this._notifyOutputChanged();
		}
	}

	public httpCall(data: IBedlamMessage, callback?: (result: any) => any): void {
		var xhr = new XMLHttpRequest();
		xhr.open("post", this._signalRApi + "/messages", true);
		if (data != null) {
			xhr.setRequestHeader('Content-Type', 'application/json');
			xhr.setRequestHeader('x-ms-client-principal-name', this._userId!)
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
		if (this._connection) this._connection.stop();
	}
}