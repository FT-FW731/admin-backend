// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import prisma from "../db/index.js";
// import config from "../config/index.js";
// import { CreateUserDTO, UpdateUserDTO } from "../models/user.dto.js";

// /**
//  * Registers a new user in the system.
//  * Hashes the password and stores user details in the database.
//  * @param name User's name
//  * @param email User's email
//  * @param password User's password
//  * @param company Optional company name
//  * @param mobile User's mobile number
//  * @throws Will throw an error if user creation fails
//  * @returns The created user object
//  */
// export async function registerUser({
//   name,
//   email,
//   password,
//   company,
//   mobile,
// }: {
//   name: string;
//   email: string;
//   password: string;
//   company?: string;
//   mobile: string;
// }): Promise<CreateUserDTO> {
//   const hashedPassword = await bcrypt.hash(password, 10);

//   const user = await prisma.user.create({
//     data: {
//       name,
//       email,
//       password: hashedPassword,
//       company,
//       mobile,
//     },
//   });

//   return user;
// }

// /**
//  * Authenticates a user and returns user data with JWT token if successful
//  * @param email User's email
//  * @param password User's password
//  * @returns An object containing the user and JWT token, or null if authentication fails
//  */
// export async function loginUser(
//   email: string,
//   password: string
// ): Promise<{ user: CreateUserDTO; token: string } | null> {
//   const user = await prisma.user.findUnique({ where: { email } });
//   if (!user) return null;

//   const valid = await bcrypt.compare(password, user.password);
//   if (!valid) return null;

//   const token = jwt.sign({ userId: user.id }, config.jwtSecret, {
//     expiresIn: "1d",
//   });
//   return { user, token };
// }

// /**
//  * Retrieves a user by their unique ID
//  * @param id User's unique identifier
//  * @returns The user object if found, otherwise null
//  */
// export async function getUserById(id: number): Promise<CreateUserDTO | null> {
//   return prisma.user.findUnique({ where: { id } });
// }
