#!/usr/bin/env node
/**
 * Gera os templates HTML dos e-mails do Supabase Auth (pt-BR, marca AgendiX).
 *
 *   node scripts/email-templates/build-auth-email-templates.mjs
 *
 * Saída: supabase/templates/*.html (colar em Authentication → Emails → Templates).
 * Regras de compatibilidade: layout em tabelas, CSS inline, largura 600,
 * botão "à prova de bala" (VML no Outlook), link em texto como alternativa e
 * nenhuma imagem obrigatória (o logo tem fallback de texto).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'supabase', 'templates');

const C = {
  page: '#F2EFE8',
  band: '#12100E',
  bandText: '#F0EBE0',
  gold: '#C9A24A',
  card: '#FFFFFF',
  text: '#1A1610',
  text2: '#55524C',
  muted: '#6E6B64',
  rule: '#E5E0D5',
  note: '#FAF8F4',
};
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";
const LOGO = 'https://www.agendixstudio.com/agendix-mark-dark.png';

export const TEMPLATES = [
  {
    file: 'recovery.html',
    panel: 'Reset password',
    subject: 'Redefina sua senha do AgendiX',
    preheader: 'Use o botão para criar uma senha nova. Se não foi você, pode ignorar este e-mail.',
    eyebrow: 'Redefinição de senha',
    title: 'Crie uma senha nova',
    body: 'Recebemos um pedido para redefinir a senha da conta <strong style="color:' + C.text + ';">{{ .Email }}</strong> no AgendiX. Use o botão abaixo para escolher a nova senha.',
    cta: 'Criar nova senha',
    note: 'Por segurança, este link vale por tempo limitado e funciona uma única vez. Se ele expirar, peça outro na tela de login.',
    footer: 'Não pediu essa alteração? Ignore este e-mail. Sua senha atual continua valendo e só muda se alguém abrir este link.',
  },
  {
    file: 'confirmation.html',
    panel: 'Confirm signup',
    subject: 'Confirme seu e-mail no AgendiX',
    preheader: 'Falta só um passo para ativar sua conta no AgendiX.',
    eyebrow: 'Confirmação de cadastro',
    title: 'Confirme seu e-mail',
    body: 'Sua conta no AgendiX foi criada com o e-mail <strong style="color:' + C.text + ';">{{ .Email }}</strong>. Confirme o endereço para começar a usar.',
    cta: 'Confirmar e-mail',
    note: 'O link de confirmação vale por tempo limitado e funciona uma única vez.',
    footer: 'Não criou uma conta no AgendiX? Ignore este e-mail. Nenhuma conta será ativada sem esta confirmação.',
  },
  {
    file: 'magic_link.html',
    panel: 'Magic link',
    subject: 'Seu link de acesso ao AgendiX',
    preheader: 'Entre no AgendiX com um toque, sem digitar senha.',
    eyebrow: 'Acesso por link',
    title: 'Entre no AgendiX',
    body: 'Use o botão abaixo para entrar na conta <strong style="color:' + C.text + ';">{{ .Email }}</strong> sem digitar a senha.',
    cta: 'Entrar no AgendiX',
    note: 'O link vale por tempo limitado e funciona uma única vez.',
    footer: 'Não pediu este acesso? Ignore este e-mail. Ninguém entra na sua conta sem abrir este link.',
  },
  {
    file: 'email_change.html',
    panel: 'Change email address',
    subject: 'Confirme seu novo e-mail no AgendiX',
    preheader: 'Confirme a troca do e-mail da sua conta no AgendiX.',
    eyebrow: 'Troca de e-mail',
    title: 'Confirme o novo e-mail',
    body: 'Recebemos um pedido para trocar o e-mail da sua conta no AgendiX de <strong style="color:' + C.text + ';">{{ .Email }}</strong> para <strong style="color:' + C.text + ';">{{ .NewEmail }}</strong>. Confirme para concluir.',
    cta: 'Confirmar novo e-mail',
    note: 'O link vale por tempo limitado e funciona uma única vez.',
    footer: 'Não pediu essa troca? Ignore este e-mail e troque sua senha por segurança. O e-mail da conta só muda com esta confirmação.',
  },
  {
    file: 'invite.html',
    panel: 'Invite user',
    subject: 'Você recebeu um convite para o AgendiX',
    preheader: 'Aceite o convite para acessar o AgendiX.',
    eyebrow: 'Convite',
    title: 'Você recebeu um convite',
    body: 'Você foi convidado para acessar o AgendiX com o e-mail <strong style="color:' + C.text + ';">{{ .Email }}</strong>. Aceite o convite para criar sua senha e entrar.',
    cta: 'Aceitar convite',
    note: 'O convite vale por tempo limitado e funciona uma única vez.',
    footer: 'Não esperava este convite? Pode ignorar este e-mail com segurança.',
  },
];

function render(t) {
  const url = '{{ .ConfirmationURL }}';
  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${t.subject}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  @media only screen and (max-width: 620px) {
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .h1 { font-size: 24px !important; line-height: 30px !important; }
    .btn a { display: block !important; }
  }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.page};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};opacity:0;">${t.preheader}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.page};">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <!-- Marca -->
        <tr>
          <td class="px" bgcolor="${C.band}" style="background-color:${C.band};padding:22px 40px;border-radius:12px 12px 0 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right:10px;vertical-align:middle;"><img src="${LOGO}" width="28" height="28" alt="" style="display:block;width:28px;height:28px;border:0;outline:none;"></td>
                <td style="vertical-align:middle;font-family:${SANS};font-size:18px;line-height:28px;font-weight:700;letter-spacing:-0.2px;color:${C.bandText};">AgendiX</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td height="3" bgcolor="${C.gold}" style="background-color:${C.gold};font-size:0;line-height:0;height:3px;">&nbsp;</td></tr>
        <!-- Conteúdo -->
        <tr>
          <td class="px" bgcolor="${C.card}" style="background-color:${C.card};padding:40px 40px 12px 40px;">
            <p style="margin:0 0 12px 0;font-family:${MONO};font-size:11px;line-height:16px;letter-spacing:1.6px;text-transform:uppercase;color:${C.muted};">${t.eyebrow}</p>
            <h1 class="h1" style="margin:0 0 16px 0;font-family:${SANS};font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.4px;color:${C.text};">${t.title}</h1>
            <p style="margin:0 0 28px 0;font-family:${SANS};font-size:16px;line-height:26px;color:${C.text2};">${t.body}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="btn" align="left">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:52px;v-text-anchor:middle;width:520px;" arcsize="20%" stroke="f" fillcolor="${C.gold}">
                    <w:anchorlock/>
                    <center style="color:${C.band};font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${t.cta}</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-- -->
                  <a href="${url}" target="_blank" style="display:block;background-color:${C.gold};border-radius:10px;color:${C.band};font-family:${SANS};font-size:16px;font-weight:700;line-height:52px;text-align:center;text-decoration:none;mso-hide:all;">${t.cta}</a>
                  <!--<![endif]-->
                </td>
              </tr>
            </table>
            <p style="margin:20px 0 0 0;font-family:${SANS};font-size:14px;line-height:22px;color:${C.text2};">${t.note}</p>
          </td>
        </tr>
        <!-- Link alternativo -->
        <tr>
          <td class="px" bgcolor="${C.card}" style="background-color:${C.card};padding:20px 40px 36px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="${C.note}" style="background-color:${C.note};border:1px solid ${C.rule};border-radius:8px;padding:14px 16px;">
                  <p style="margin:0 0 6px 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.text2};">O botão não abriu? Copie e cole este endereço no navegador:</p>
                  <p style="margin:0;font-family:${MONO};font-size:12px;line-height:18px;word-break:break-all;"><a href="${url}" target="_blank" style="color:${C.text};text-decoration:underline;">${url}</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Segurança -->
        <tr>
          <td class="px" bgcolor="${C.card}" style="background-color:${C.card};padding:0 40px 36px 40px;border-radius:0 0 12px 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="border-top:1px solid ${C.rule};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>
            </table>
            <p style="margin:20px 0 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.muted};">${t.footer}</p>
          </td>
        </tr>
        <!-- Rodapé -->
        <tr>
          <td align="center" style="padding:24px 24px 0 24px;">
            <p style="margin:0;font-family:${SANS};font-size:12px;line-height:18px;color:${C.muted};">AgendiX · Agenda e gestão para o seu negócio</p>
            <p style="margin:4px 0 0 0;font-family:${SANS};font-size:12px;line-height:18px;color:${C.muted};"><a href="https://www.agendixstudio.com" target="_blank" style="color:${C.muted};text-decoration:underline;">www.agendixstudio.com</a> · E-mail automático, não é preciso responder.</p>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>
`;
}

mkdirSync(OUT, { recursive: true });
for (const t of TEMPLATES) {
  writeFileSync(join(OUT, t.file), render(t));
  console.log(`supabase/templates/${t.file}  ←  ${t.panel}  |  Assunto: ${t.subject}`);
}
