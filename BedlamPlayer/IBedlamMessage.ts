export interface IBedlamMessage {
  messageID: string;
  sender: string;
  recipient?: string;
  cardId?: number | number[];
  userId?: string;
  type:
    'new-dealerview-card' |
    'game-stage' |
    'fave-card' |
    'unfave-card' |
    'done-fave' |
    'choose-winner' |
    'new-card' |
    'played-card' |
    'add-user' |
    'remove-user' |
    'ack-user';
}