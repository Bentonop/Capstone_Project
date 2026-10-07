import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, role, code } = body;

    if (!email || !role || !code) {
      return NextResponse.json({ error: "Faltan datos (email, role, code)" }, { status: 400 });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return NextResponse.json({ error: "Falta configurar EMAIL_USER y EMAIL_PASS en .env.local" }, { status: 500 });
    }

    // Configurar el transporte SMTP con Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código de Acceso - Cuerpo y Alma</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background-color: #F8FAFC; text-align: center;">

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 0;">
        <tr>
            <td align="center">
                <table border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-top: 5px solid #2DD4BF; border-radius: 16px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05); max-width: 400px; width: 90%; text-align: center;">
                    <tr>
                        <td style="padding: 40px;">
                            <div style="display: inline-block; background-color: #F0FDFA; color: #0F766E; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; margin-bottom: 20px;">
                                Academia Cuerpo y Alma
                            </div>
                            <h1 style="font-size: 1.5rem; color: #1E293B; margin-bottom: 8px; font-weight: 700; margin-top: 0;">¡Hola, ${email}!</h1>
                            <p style="font-size: 0.95rem; color: #64748B; margin-bottom: 30px; margin-top: 0;">
                                Has sido invitado a unirte a nuestra academia como <strong>${role}</strong>. Para acceder a tu panel y clases, regístrate en nuestra plataforma usando este código.
                            </p>
                            
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0F172A; border-radius: 12px;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <div style="color: #94A3B8; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                                            Tu código de acceso
                                        </div>
                                        <div style="color: #FFFFFF; font-family: 'Courier New', Courier, monospace; font-size: 2.2rem; font-weight: bold; letter-spacing: 4px;">
                                            ${code}
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="font-size: 0.8rem; color: #94A3B8; margin-top: 30px; margin-bottom: 0;">
                                Este código es único y de un solo uso. No lo compartas con nadie.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

</body>
</html>
    `;

    // Enviar el correo
    const info = await transporter.sendMail({
      from: '"Cuerpo y Alma" <' + process.env.EMAIL_USER + '>', // sender address
      to: email, // list of receivers
      subject: '¡Tu invitación a Cuerpo y Alma!', // Subject line
      html: htmlContent, // html body
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Error enviando email con Nodemailer:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
