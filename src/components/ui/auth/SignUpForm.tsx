"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Field,
    FieldError,
    FieldLabel,
} from "@/components/ui/field";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import toast from "react-hot-toast";
import { AuthFormProps } from "./AuthForm";
import { supabase } from "@/lib/supabase"; 

const SignUpForm = ({ setTypeSelected }: AuthFormProps) => {

    const [isLoading, setisLoading] = useState<boolean>(false)

    // ============ Form ============
    // Eliminamos telefono_emergencia porque no está en tu nueva tabla
    const formSchema = z.object({
        rut: z.string().min(8, 'El RUT es obligatorio (ej: 12345678-9)'),
        nombres: z.string().min(2, 'Ingresa tus nombres'),
        apellidos: z.string().min(2, 'Ingresa tus apellidos'),
        email: z.string().email('Por favor ingresa un correo válido. Ejemplo: user@mail.com'),
        password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
        telefono: z.string().min(8, 'Ingresa un número de teléfono válido'),
        codigo_invitacion: z.string().min(6, 'El código de invitación debe tener al menos 6 caracteres'),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            rut: '',
            nombres: '',
            apellidos: '',
            email: '',
            password: '',
            telefono: '',
            codigo_invitacion: '',
        }
    })

    const { handleSubmit, formState, register } = form;
    const { errors } = formState;

    // ============ Sign Up ===========
    const onSubmit = async (user: z.infer<typeof formSchema>) => {
        setisLoading(true);

        try {
            if (!supabase) throw new Error("Error de conexión con la base de datos.");

            // El registro y la verificación de la whitelist ahora son manejados
            // automáticamente por un Trigger en la base de datos de Supabase.
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: user.email,
                password: user.password,
                options: {
                    data: {
                        nombres: user.nombres,
                        apellidos: user.apellidos,
                        rut: user.rut,
                        telefono: user.telefono,
                        codigo_invitacion: user.codigo_invitacion
                    }
                }
            });

            if (authError) throw authError;

            toast.success('¡Cuenta creada exitosamente! Revisa tu correo.', { duration: 4000 });
            setTypeSelected('sign-in');

        } catch (error: any) {
            toast.error(error.message || 'Error al registrar el usuario', { duration: 4000 });
        } finally {
            setisLoading(false);
        }
    }

    return (
        <div>
            <div className="w-full backdrop-blur-xl rounded-4xl pb-4">

                <div className="text-center">
                    <h1 className="lg:text-5xl md:text-4xl text-3xl font-semibold text-center my-4">
                        Crear Cuenta
                    </h1>

                    <p className="text-sm text-muted-foreground mb-8">
                        Ingresa tus datos para registrarte
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="mx-4">
                    <div className="grid gap-2">

                        {/* ========== RUT ========= */}
                        <Field className="mb-3">
                            <FieldLabel htmlFor="rut">RUT</FieldLabel>
                            <Input
                                {...register("rut")}
                                id="rut"
                                placeholder="12345678-9"
                                type="text"
                                disabled={isLoading}
                                aria-invalid={!!errors.rut}
                            />
                            {errors.rut && <FieldError>{errors.rut.message}</FieldError>}
                        </Field>

                        {/* ========== Nombres ========= */}
                        <Field className="mb-3">
                            <FieldLabel htmlFor="nombres">Nombres</FieldLabel>
                            <Input
                                {...register("nombres")}
                                id="nombres"
                                placeholder="Ej: Juan Pablo"
                                type="text"
                                disabled={isLoading}
                                aria-invalid={!!errors.nombres}
                            />
                            {errors.nombres && <FieldError>{errors.nombres.message}</FieldError>}
                        </Field>

                        {/* ========== Apellidos ========= */}
                        <Field className="mb-3">
                            <FieldLabel htmlFor="apellidos">Apellidos</FieldLabel>
                            <Input
                                {...register("apellidos")}
                                id="apellidos"
                                placeholder="Ej: Pérez Gómez"
                                type="text"
                                disabled={isLoading}
                                aria-invalid={!!errors.apellidos}
                            />
                            {errors.apellidos && <FieldError>{errors.apellidos.message}</FieldError>}
                        </Field>

                        {/* ========== Email ========= */}
                        <Field className="mb-3">
                            <FieldLabel htmlFor="email">Correo</FieldLabel>
                            <Input
                                {...register("email")}
                                id="email"
                                placeholder="name@example.com"
                                type="email"
                                disabled={isLoading}
                                aria-invalid={!!errors.email}
                            />
                            {errors.email && <FieldError>{errors.email.message}</FieldError>}
                        </Field>

                        {/* ========== Teléfono ========= */}
                        <Field className="mb-3">
                            <FieldLabel htmlFor="telefono">Teléfono</FieldLabel>
                            <Input
                                {...register("telefono")}
                                id="telefono"
                                placeholder="+56 9 1234 5678"
                                type="text"
                                disabled={isLoading}
                                aria-invalid={!!errors.telefono}
                            />
                            {errors.telefono && <FieldError>{errors.telefono.message}</FieldError>}
                        </Field>

                        {/* ========== Password ========= */}
                        <Field className="mb-3">
                            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                            <Input
                                {...register("password")}
                                id="password"
                                placeholder="*****"
                                type="password"
                                disabled={isLoading}
                                aria-invalid={!!errors.password}
                            />
                            {errors.password && <FieldError>{errors.password.message}</FieldError>}
                        </Field>

                        {/* ========== Código de Invitación ========= */}
                        <Field className="mb-3">
                            <FieldLabel htmlFor="codigo_invitacion">Código de Invitación</FieldLabel>
                            <Input
                                {...register("codigo_invitacion")}
                                id="codigo_invitacion"
                                placeholder="Ej: 123456"
                                type="text"
                                disabled={isLoading}
                                aria-invalid={!!errors.codigo_invitacion}
                            />
                            {errors.codigo_invitacion && <FieldError>{errors.codigo_invitacion.message}</FieldError>}
                        </Field>

                        {/* ========== Submit ========= */}
                        <Button className="mt-6" type="submit" disabled={isLoading}>
                            {isLoading && (
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Crear cuenta
                        </Button>

                    </div>
                </form>

                {/* ========== Sign In ========= */}
                <p className="text-center text-sm mt-6 text-white">
                    ¿Ya tienes una cuenta?{" "}
                    <span
                        onClick={() => !isLoading && setTypeSelected('sign-in')}
                        className="underline underline-offset-4 hover:text-primary cursor-pointer"
                    >
                        Inicia Sesión
                    </span>
                </p>

            </div>
        </div>
    );
}

export default SignUpForm;