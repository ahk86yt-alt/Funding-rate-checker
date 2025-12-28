import { resend } from "./mail";

export async function sendVerifyEmail(
  email: string,
  token: string
) {
  const verifyUrl = `${process.env.APP_URL}/api/auth/verify?token=${token}`;

  await resend.emails.send({
    from: "Funding App <no-reply@funding-app.dev>",
    to: email,
    subject: "【Funding App】メールアドレスの確認をお願いします",
    html: `
      <div style="font-family: sans-serif; line-height:1.6">
        <h2>Funding App へようこそ</h2>

        <p>
          このたびは Funding App にご登録いただきありがとうございます。
        </p>

        <p>
          以下のボタンをクリックして、メールアドレスの確認を完了してください。
        </p>

        <p style="margin:24px 0">
          <a
            href="${verifyUrl}"
            style="
              background:#2563eb;
              color:white;
              padding:12px 20px;
              text-decoration:none;
              border-radius:6px;
              display:inline-block;
            "
          >
            メールアドレスを確認する
          </a>
        </p>

        <p style="color:#6b7280;font-size:13px">
          ※ このリンクは一定時間後に無効になります。<br/>
          ※ 心当たりがない場合は、このメールを破棄してください。
        </p>

        <hr/>

        <p style="font-size:12px;color:#9ca3af">
          Funding App Team
        </p>
      </div>
    `,
  });
}
