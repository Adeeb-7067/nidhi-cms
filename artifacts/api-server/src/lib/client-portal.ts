import {
  usersTable,
  credentialHistoryTable,
  getNextSequence,
} from "@workspace/db/schema";
import { hashPassword, encryptPasswordForHistory } from "./password";
import { HttpError } from "./http-error";

export async function createClientPortalUser(params: {
  name: string;
  email: string;
  password: string;
  setByUserId: number;
  setByLabel: string;
}): Promise<number> {
  const email = params.email.toLowerCase().trim();
  if (!email) {
    throw new HttpError(400, "Portal login email is required.", {
      code: "VALIDATION_ERROR",
      field: "portalEmail",
    });
  }
  if (!params.password || params.password.length < 8) {
    throw new HttpError(400, "Portal password must be at least 8 characters.", {
      code: "VALIDATION_ERROR",
      field: "password",
    });
  }

  const existing = await usersTable.findOne({ email });
  if (existing) {
    throw new HttpError(
      409,
      "This portal login email is already registered. Use a different email or link the existing user.",
      { code: "CONFLICT", field: "portalEmail" },
    );
  }

  const passwordHash = await hashPassword(params.password);
  const userId = await getNextSequence("users");
  const user = await usersTable.create({
    id: userId,
    name: params.name,
    email,
    passwordHash,
    role: "client",
    designation: "Client",
    status: "active",
  });

  const credId = await getNextSequence("credential_history");
  await credentialHistoryTable.create({
    id: credId,
    userId: user.id,
    entryNumber: 1,
    setByUserId: params.setByUserId,
    setByLabel: params.setByLabel,
    passwordEncrypted: encryptPasswordForHistory(params.password),
    trigger: "initial_setup",
    status: "active",
  });

  return user.id;
}

export async function updateClientPortalPassword(params: {
  userId: number;
  password: string;
  setByUserId: number;
  setByLabel: string;
}): Promise<void> {
  if (!params.password || params.password.length < 8) {
    throw new HttpError(400, "Portal password must be at least 8 characters.", {
      code: "VALIDATION_ERROR",
      field: "password",
    });
  }

  const user = await usersTable.findOne({ id: params.userId, role: "client" });
  if (!user) {
    throw new HttpError(404, "Portal user account not found for this company.", {
      code: "NOT_FOUND",
    });
  }

  const passwordHash = await hashPassword(params.password);
  await usersTable.updateOne({ id: params.userId }, { $set: { passwordHash } });

  const credCount = await credentialHistoryTable.countDocuments({ userId: params.userId });
  const credId = await getNextSequence("credential_history");
  await credentialHistoryTable.updateMany(
    { userId: params.userId, status: "active" },
    { $set: { status: "superseded" } },
  );
  await credentialHistoryTable.create({
    id: credId,
    userId: params.userId,
    entryNumber: credCount + 1,
    setByUserId: params.setByUserId,
    setByLabel: params.setByLabel,
    passwordEncrypted: encryptPasswordForHistory(params.password),
    trigger: "admin_reset",
    status: "active",
  });
}
