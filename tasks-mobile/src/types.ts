export type Session = {
  token: string;
  refreshToken?: string;
  user: {id: number; name: string; email: string; role: string};
};
