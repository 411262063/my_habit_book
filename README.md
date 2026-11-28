# 習慣打卡本

習慣打卡網頁 app，手機和電腦用同一份網頁：每天記錄習慣、看月曆和圖表、完成習慣累積點數並兌換獎勵。

純 HTML、CSS、JavaScript，沒有建置步驟。資料存在 Firebase（Email／密碼登入、Firestore）。

## 檔案

- `index.html`：畫面結構
- `style.css`：樣式（主題色、淺色／深色模式都在 `:root` 的變數裡）
- `app.js`：程式邏輯（資料存取、各分頁畫面、事件處理）
- `firebase-config.js`：你自己的 Firebase 專案設定（見下方「第一次設定」）

## 資料存在哪裡

資料存在 Firebase（Google 的雲端服務，有免費額度）。用 email/密碼登入後，手機和電腦只要登入**同一個帳號**，看到的就是同一份資料，會自動同步，也支援離線先記、之後連網再補上傳。

如果連不到 Firebase（例如 `firebase-config.js` 還沒填、或網路不通且本機也沒有登入過的快取），會暫時把資料存在目前瀏覽器的 localStorage，不會同步，畫面上的訊息會告訴你發生了什麼事。

想備份、或把資料搬到另一個沒登入過的環境，用「設定 → 備份與還原」的下載備份檔和從備份檔還原。

## 第一次設定

### 1. 建立 Firebase 專案（免費）

1. 到 https://console.firebase.google.com 用 Google 帳號登入，建立一個新專案（名稱隨意，不用開 Google Analytics）。
2. 專案建立後，進「建構」→「Authentication」→「開始使用」，在「登入方式」分頁啟用 **Email/密碼**。
3. 進「建構」→「Firestore Database」→「建立資料庫」，選一個離你近的地區，先選「正式環境模式」（production mode）即可——規則等下一步會換掉。
4. 回到「專案總覽」旁的齒輪 →「專案設定」→ 最下面「你的應用程式」→ 點網頁圖示 `</>` 新增一個網頁應用程式（不需要勾 Firebase Hosting）。建立後會看到一段 `firebaseConfig` 物件。

### 2. 填入設定

把上一步看到的 `firebaseConfig` 內容，貼到這個 repo 的 `firebase-config.js`，取代裡面的預留值。這組設定不是密碼，可以放進 git、公開的網站裡沒關係——真正決定誰能讀寫資料的是下一步的安全規則。

### 3. 設定 Firestore 安全規則（重要，別省略）

在 Firebase Console 的「Firestore Database」→「規則」分頁，把內容換成：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /data/users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

這樣每個人只能讀寫自己帳號底下的資料，別人登入自己的帳號看不到你的紀錄。按「發布」套用。

### 4. 放到網路上，讓手機和電腦都能打開

最簡單的方式是 GitHub Pages（免費）：

1. 把這個 repo push 到 GitHub（已經是 `411262063/my_habit_book` 的話可以直接推）。
2. 到 repo 的 Settings → Pages，Source 選「Deploy from a branch」，Branch 選 `main` / `/(root)`，存檔。
3. 等一兩分鐘，會出現一個 `https://411262063.github.io/my_habit_book/` 之類的網址，手機和電腦都用這個網址打開、登入同一個帳號即可。

### 5. 建立你的帳號

打開網址後，畫面會先看到登入畫面。按「建立帳號」，輸入 email 和密碼（密碼至少 6 個字）即可開始使用；之後在另一台裝置用同一組 email/密碼登入，資料就會同步過去。

## 在自己電腦上跑

`app.js` 是 ES module，直接雙擊 `index.html`（`file://`）會打不開，要開一個本機伺服器，例如：

```
python -m http.server 8000
```

然後用瀏覽器開 http://localhost:8000 。這樣連的是正式的 Firebase 專案，測試時建議用另一個帳號登入，不要動到真正的紀錄。

## 功能

- 習慣類型：打勾、選項、比例（幾分之幾或百分比）、數字（內建計算機）、時間、文字、多筆清單（可加標籤和數字欄位）
- 頻率：每天、每週指定幾天、每週幾次
- 月曆：每月目標、每天完成比例、各習慣完成率、單一習慣的數值圖表
- 點數與獎勵：點數只加不扣，獎勵可編輯、拖拉排序、依點數排序
- 設定：帳號登入／登出、主題色（含自訂檢色器與儲存的顏色）、淺色／深色模式、備份與還原
