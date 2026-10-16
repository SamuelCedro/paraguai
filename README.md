# Paraguai Expresso

Área de membros estática servida por uma Vercel Function após login individual por e-mail e senha no Supabase Auth.

## Configurar autenticação

1. Crie um projeto em [Supabase](https://supabase.com/dashboard/new).
2. Em **Authentication → Providers → Email**, mantenha o login por e-mail e senha ativo. Em **Authentication → Settings**, desative **Allow new users to sign up** para que somente alunos cadastrados pela equipe possam entrar.
3. Em **Authentication → Users**, cadastre ou convide cada aluno. O projeto não oferece cadastro público.
4. Configure as variáveis abaixo no projeto Vercel para **Production** e **Preview**:
   - `SUPABASE_URL`: URL HTTPS do projeto Supabase.
   - `SUPABASE_PUBLISHABLE_KEY`: chave publicável (`sb_publishable_...` ou `anon`).
   - `AUTH_COOKIE_KEY`: 32 bytes aleatórios em hexadecimal. Gere com `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` e guarde somente na Vercel.
5. Faça um novo deploy após adicionar as variáveis. Mudanças nas variáveis não alteram deploys antigos.

`/` mostra o formulário de login. `/area` é servida por `api/member.js` depois que o servidor valida a sessão. Os arquivos da área de membros ficam fora de `public` e não são distribuídos como páginas estáticas. `/versao-escura.html` deixa de ser publicada.

## Verificar localmente

```sh
node --test test/auth.test.js
npx vercel dev
```

Este primeiro passo controla a entrada da área de membros. A liberação de módulos por compra ainda precisa ser implementada no servidor; atualmente todos os usuários autenticados veem os mesmos módulos.
