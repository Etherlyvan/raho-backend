import { RoleName } from "../generated/prisma";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId:   string;
        email:    string;
        role:     RoleName;
        branchId: string | null;
      };
    }
  }
}
export {};
