export interface JwtUser {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}
