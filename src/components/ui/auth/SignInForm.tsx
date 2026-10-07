"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
Field,
FieldError,
FieldLabel,
} from "@/components/ui/field";

import * as z from "zod";
import { Form, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useState } from "react";
import { Image as ImageIcon, LoaderCircle } from "lucide-react";
import toast from "react-hot-toast";
import { AuthFormProps } from "./AuthForm";
import { supabase } from "@/lib/supabase";


const SignInForm = ({ setTypeSelected }: AuthFormProps) => {

    const [isLoading, setisLoading] = useState<boolean>(false)

    // ============ Form ============
    const formSchema = z.object({
        email: z.string().email('Por favor ingresa un correo válido. Ejemplo: user@mail.com').min(1, {
            message: 'Este campo es requerido'
        }),
        password: z.string().min(6, {
            message: 'La contraseña debe tener al menos 6 caracteres'
        })
    })

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: ''
        }
    })

    const { handleSubmit, formState, register } = form;
    const { errors } = formState;

    // ============ Sign In ===========
    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        setisLoading(true);

        try {
            if (!supabase) throw new Error("Error de conexión con la base de datos.");

            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) throw error;
            
            // Get user role to redirect
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', authData.user.id)
                .single();
                
            toast.success('Inicio de sesión exitoso', { duration: 2500 });
            
            if (profile?.role === 'administrador') {
                window.location.href = '/admin/dashboard';
            } else if (profile?.role === 'profesor') {
                window.location.href = '/profesor/dashboard';
            } else {
                window.location.href = '/alumno/dashboard';
            }
        } catch (error: any) {
            toast.error(error.message, { duration: 2500 });
        } finally {
            setisLoading(false);
        }
    }

    const githubSignIn = async () => {

    }

    const googleSignIn = async () => {

    }

    return (
        <div>
            <div className="w-full backdrop-blur-xl py-2 rounded-4xl">
                <div className="text-center">
                    <div
                        role="img"
                        aria-label="Espacio para el logo de la empresa"
                        className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30"
                    >
                        <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
                    </div>
                    <h1 className="lg:text-5xl md:text-4xl text-3xl font-semibold text-center my-4">Iniciar Sesión</h1>
                    <p className="text-sm text-muted-foreground mb-8">
                        Bienvenida/o a Cuerpo y Alma.
                    </p>
                    <p>Ingresa tu correo y contraseña para continuar.</p>
                </div>

                
                <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="grid gap-2">
                            {/* ========== Email ========= */}
                            <Field className="mb-3">
                                <FieldLabel htmlFor="email">
                                    Correo
                                </FieldLabel>

                                    <Input
                                        {...register("email")}
                                        id="email"
                                        placeholder="name@example.com"
                                        type="email"
                                        autoComplete="email"
                                        disabled={isLoading}
                                        aria-invalid={!!errors.email}
                                    />

                                {errors.email && (
                                    <FieldError>
                                        {errors.email.message}
                                    </FieldError>
                                )}
                            </Field>

                            {/* ========== Password ========= */}
                            <Field className="mb-3">
                                    <FieldLabel htmlFor="password">
                                        Contraseña
                                    </FieldLabel>

                                        <Input
                                            {...register("password")}
                                            id="password"
                                            placeholder="*****"
                                            type="password"
                                            autoComplete="current-password"
                                            disabled={isLoading}
                                            aria-invalid={!!errors.password}
                                        />

                                    {errors.password && (
                                        <FieldError>
                                            {errors.password.message}
                                        </FieldError>
                                    )}
                            </Field>

                            <div
                                onClick={() => setTypeSelected('recover-password')}
                                className="underline text-foreground underline-offset-4 hover:text-primary mb-6 text-sm text-end cursor-pointer"
                            >
                                ¿Olvidaste tu contraseña?
                            </div>

                            {/* ========== Submit ========= */}
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && (
                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Ingresar
                            </Button>


                            {/* Botones OAuth (Ocultos temporalmente)
                            <div className="grid grid-cols-1 gap-3">
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={googleSignIn}
                                    disabled={isLoading}
                                    className="flex w-full items-center justify-center gap-2 cursor-pointer"
                                >
                                    ...Google
                                </Button>
                            </div>
                            */}
                        </div>
                    
                </form>

                {/* ========== Sign Up ========= */}
                <p className="text-center text-sm text-foreground mt-4">
                    {"¿No tienes cuenta?  "}
                    <span
                        onClick={() => setTypeSelected('sign-up')}
                        className="underline underline-offset-4 hover:text-primary cursor-pointer"
                    >
                        Regístrate
                    </span>
                </p>
            </div>
        </div>
    );
}

export default SignInForm;