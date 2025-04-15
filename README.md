# AverbePorto-MCP

[![smithery badge](https://smithery.ai/badge/@GHSix/averbeporto-mcp)](https://smithery.ai/server/@GHSix/averbeporto-mcp)

## 🌟 Sobre
O AverbePorto-MCP é um servidor MCP (Model Context Protocol) que permite a integração com a plataforma [AverbePorto](https://www.averbeporto.com.br), facilitando o acesso aos serviços de autenticação e envio de documentos através de ferramentas de IA (Inteligência Artificial).

## 🌐 Acessando o Sistema Web

1. Acesse [https://www.averbeporto.com.br](https://www.averbeporto.com.br)
2. Faça login com suas credenciais de usuário
3. Na plataforma, você poderá:
   - Gerar Credenciais de API em Cadastro do Usuário
   - Realizar envio de documentos XML
   - Consultar protocolos ANTT
   - Acompanhar e gerenciar suas averbações de seguros de carga

## 🤖 Utilizando o MCP Server com Ferramentas de IA

### Instalação pelo Smithery

Para instalar averbeporto-mcp para Claude Desktop automaticamente via [Smithery](https://smithery.ai/server/@GHSix/averbeporto-mcp):

```bash
npx -y @smithery/cli install @GHSix/averbeporto-mcp --client claude
```

### [Claude Desktop](https://claude.ai/download)
1. Edite o arquivo `%APPDATA%\Claude\claude_desktop_config.json` (Windows) ou `~/Library/Application Support/Claude/claude_desktop_config.json` (MacOS) e adicione a seguinte configuração:
   ```json
    {
      "mcpServers": {
        "AverbePorto-MCP": {
          "command": "node",
          "args": ["/caminho/para/AverbePorto-MCP/build/index.js"]
        }
      }
    }
   ```
2. Ao iniciar a conversa, o servidor MCP será automaticamente iniciado com base na configuração.

### [Cursor](https://www.cursor.com/), [Roo Code](https://roocode.com/) e outros
1. Crie um arquivo como `.cursor/mcp.json` ou `.roo/mcp.json` em seu projeto com a seguinte configuração:
   ```json
    {
      "mcpServers": {
        "AverbePorto-MCP": {
          "command": "node",
          "args": ["/caminho/para/AverbePorto-MCP/build/index.js"],
          "disabled": false,
          "alwaysAllow": []
        }
      }
    }
   ```
2. Ao iniciar a conversa, o servidor MCP será automaticamente iniciado com base na configuração.

### [Github Copilot](https://github.com/features/copilot)
1. Com o Github Copilot ativo em seu editor, crie o arquivo `.vscode/mcp.json`:
   ```json
   {
     "inputs": [
       {
         "type": "promptString",
         "id": "averbeporto-user",
         "description": "AverbePorto API Username"
       },
       {
         "type": "promptString",
         "id": "averbeporto-pass",
         "description": "AverbePorto API Password",
         "password": true
       }
     ],
     "servers": {
       "AverbePorto-MCP": {
         "command": "node",
         "args": ["/caminho/para/AverbePorto-MCP/build/index.js"],
         "env": {
           "AVERBEPORTO_USER": "${input:averbeporto-user}",
           "AVERBEPORTO_PASS": "${input:averbeporto-pass}"
         }
       }
     }
   }
   ```
2. O VS Code solicitará suas credenciais na primeira execução e as armazenará de forma segura.
3. O Copilot reconhecerá os comandos MCP e oferecerá sugestões contextualizadas para:
   - Autenticação na API
   - Upload de documentos XML
   - Consulta de protocolos ANTT
4. As credenciais serão automaticamente injetadas nas chamadas da API.

## 📚 Ferramentas Disponíveis para a IA

O AverbePorto-MCP oferece as seguintes ferramentas:

- `login`: Autenticação na plataforma
  - Parâmetros: `user`, `pass`
  - Retorna: `sessionId`

- `upload`: Envio de documentos
  - Parâmetros: `sessionId`, `filePath`, `recipient` (opcional), `version` (opcional)

- `consultProtocol`: Consulta de protocolos por chave ou vice-versa
  - Parâmetros: `sessionId`, `keys`, `protocols`, `outputFormat`, `download`, `delimiter`
  - Formatos de saída: json, xml, csv

## 🔒 Segurança
- Utilize as credenciais de API geradas no módulo Cadastro do Usuário
- Mantenha suas credenciais em segurança
- Não compartilhe seu `sessionId`
- Utilize sempre conexões seguras
- Mantenha o servidor MCP atualizado
