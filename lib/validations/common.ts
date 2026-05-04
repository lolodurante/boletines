import { z } from "zod"

export const idSchema = z.string().min(1)
export const optionalEmailSchema = z.string().email().optional()
export const requiredEmailSchema = z.string().email()
export const isoDateSchema = z.coerce.date()
