export interface IBedlamMessage
{
  messageID: string;
  sender: string;
  recipient?: string;
  cardId?: number;
  userId?: string;
  type: 'new-card' | 'played-card' | 'add-user' | 'remove-user';
}