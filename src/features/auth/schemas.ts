import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse email est requise.")
    .email("Format d'adresse email invalide."),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères."),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signUpSchema = z.object({
  fullName: z
    .string()
    .min(2, "Le nom complet doit comporter au moins 2 caractères."),
  email: z
    .string()
    .min(1, "L'adresse email est requise.")
    .email("Format d'adresse email invalide."),
  password: z
    .string()
    .min(8, "Le mot de passe doit comporter au moins 8 caractères pour votre sécurité."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const onboardingSchema = z.object({
  schoolType: z.string().min(1, "Veuillez sélectionner le type d'établissement."),
  schoolName: z
    .string()
    .min(3, "Le nom de l'établissement doit comporter au moins 3 caractères."),
  schoolCode: z
    .string()
    .min(2, "Le code court doit comporter au moins 2 caractères.")
    .max(10, "Le code court ne peut dépasser 10 caractères.")
    .toUpperCase(),
  city: z.string().min(2, "La ville est requise."),
  country: z.string().default("Togo"),
  currency: z.string().default("XOF"),
  periodType: z.enum(["trimestre", "semestre"]).default("trimestre"),
  priorities: z.array(z.string()).default([]),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
