import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse email est requise.")
    .email("Format d'adresse email invalide."),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchoolSchema = z.object({
  schoolName: z
    .string()
    .min(3, "Le nom de l'établissement doit comporter au moins 3 caractères."),
  schoolCode: z
    .string()
    .min(2, "Le code court doit comporter au moins 2 caractères.")
    .max(10, "Le code court ne peut dépasser 10 caractères.")
    .toUpperCase(),
  country: z.string().default("Togo"),
  city: z
    .string()
    .min(2, "La ville est requise."),
  currency: z.string().default("XOF"),

  firstName: z
    .string()
    .min(2, "Le prénom doit comporter au moins 2 caractères."),
  lastName: z
    .string()
    .min(2, "Le nom doit comporter au moins 2 caractères."),
  email: z
    .string()
    .min(1, "L'adresse email est requise.")
    .email("Format d'adresse email invalide."),
  password: z
    .string()
    .min(8, "Le mot de passe doit comporter au moins 8 caractères pour la sécurité."),
});

export type RegisterSchoolInput = z.infer<typeof registerSchoolSchema>;
