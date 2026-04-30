export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface INotificationChannel {
  sendEmail(message: EmailMessage): Promise<void>;
}
