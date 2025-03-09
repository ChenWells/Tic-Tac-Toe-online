# 井字遊戲 - 線上多人版本

這是一個使用 Node.js、Socket.IO 和原生 JavaScript 開發的線上多人井字遊戲。玩家可以創建房間、加入其他玩家的房間，並進行即時對戰。

## 功能特點

- 🎮 即時多人對戰
- 🚪 房間系統
- 💬 即時聊天功能
- 📊 玩家統計
- 🎯 自動配對
- 🔒 簡單的用戶認證系統

## 技術棧

- 前端：HTML、JavaScript、Tailwind CSS
- 後端：Node.js、Express
- 即時通訊：Socket.IO

## 安裝步驟

1. 克隆專案
```bash
git clone https://github.com/ChenWells/Tic-Tac-Toe-online.git
cd Tic-Tac-Toe-online
```

2. 安裝依賴
```bash
npm install
```

3. 啟動服務器
```bash
node server.js
```

4. 在瀏覽器中訪問
```
http://localhost:3000
```

## 測試帳號

為方便測試，系統提供了以下測試帳號：

- 用戶名：player1，密碼：123
- 用戶名：player2，密碼：123
- 用戶名：player3，密碼：123

## 遊戲規則

1. 玩家可以創建新房間或加入現有房間
2. 每個房間限制 2 名玩家
3. 第一個加入的玩家使用 X，第二個玩家使用 O
4. 玩家輪流在 3x3 的格子中放置自己的符號
5. 首先在橫、直或對角線上連成一線的玩家獲勝

## 開發者

- 作者：Chen FuKuo
- GitHub：[ChenWells](https://github.com/ChenWells)

## 授權

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 文件 