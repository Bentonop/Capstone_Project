"use client"

import RecoverPasswordForm from "./RecoverPasswordForm";
import SignInForm from "./SignInForm";
import SignUpForm from "./SignUpForm";

import { useState } from "react";
import { Dispatch, SetStateAction } from "react";

export interface AuthFormProps{ 
    setTypeSelected: Dispatch<SetStateAction<"sign-up" | "sign-in" | "recover-password">>;
}

interface AuthModalProps {
    type: 'sign-up' | 'sign-in' | 'recover-password'
}

const AuthForm = ({ type }: AuthModalProps) => {

    const [typeSelected, setTypeSelected] = useState<'sign-up' | 'sign-in' | 'recover-password'>(type);

    return (
        <div className="mx-auto w-[calc(100%_-_1.5rem)] max-w-lg bg-background lg:border lg:border-white/50 mt-10 lg:p-6" style={{ borderRadius: 20 }}>
            {typeSelected === 'sign-in' && (<SignInForm setTypeSelected={setTypeSelected} />)}
            {typeSelected === 'sign-up' && (<SignUpForm setTypeSelected={setTypeSelected} />)}
            {typeSelected === 'recover-password' && (<RecoverPasswordForm setTypeSelected={setTypeSelected} />)}
        </div>
    );
}

export default AuthForm;