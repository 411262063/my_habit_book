# CLAUDE.md

給 Claude Code 的專案說明。請用繁體中文跟我溝通。

## 專案是什麼

習慣打卡本：我自己用的習慣追蹤網頁 app，手機優先。每天記錄習慣，看月曆和圖表，完成習慣累積點數，再用點數兌換自己設定的獎勵。

- 純 HTML、CSS、JavaScript，沒有建置步驟。
- 資料存在 Firebase（Email／密碼登入、Firestore），連不上時退回瀏覽器的 localStorage。
- 早期版本放在 Claude 的 artifact 上，已經**停止維護**，不用管它，也不要為了相容它而保留程式碼。

## 架構

### 檔案

- `index.html`：外框，只有標題、點數六角形、同步狀態列、五個分頁按鈕（今天／月曆／習慣／獎勵／設定），以及 `#view`、`#modal` 兩個容器。內容全部由 `app.js` 產生。
- `style.css`：全部樣式。`:root` 定義顏色與字體變數，深色模式用 `prefers-color-scheme` 或 `:root[data-theme="dark"]` 覆寫。主題色由 `app.js` 的 `applyTheme()` 在執行時改寫 `--accent`／`--good`／`--accent-ink`。
- `app.js`：所有程式邏輯，以 `<script type="module">` 載入，從 gstatic CDN 匯入 Firebase SDK 13.4.0（app／auth／firestore）。大致分段：
  - storage：Firebase 初始化、登入狀態、`onSnapshot` 讀取、`save()`／`writeDoc()` 防抖寫入、localStorage 退路
  - logic：`scheduled()`（這天有沒有排）、`isDone()`（依類型判斷完成）、`doneOn()`／`ptsOn()`（先讀鎖定結果）、`earned()`／`spent()`／`balance()`、`migrate()`
  - render：`render()` 依 `S.view` 整頁重畫 `#view`，`vToday`／`vCal`／`vHabits`／`vRewards`／`vSettings`、編輯表單 `vEdit`、計算機 `vCalc`
  - events：在 `document` 上統一處理 `click`（`data-act`）、`input`／`change`（`data-in`、`data-e`、`data-au`）、`keydown`，拖拉排序用 pointer 事件
  - 全域狀態都在 `S`：`S.cfg`（設定）、`S.days`（每天的紀錄）、`S.mode`（`loading`／`auth`／`cloud`／`local`），其他是畫面暫存狀態
- `firebase-config.js`：匯出 `firebaseConfig`（Firebase 網頁應用程式設定，不是密碼）。

### 資料結構

Firestore 路徑：集合 `data/users/{uid}`，底下每份文件：

- `config`：使用者設定，整份覆寫
  - `habits[]`：`{id, name, color, type, freq:{kind:'daily'|'weekdays'|'weekly', days:[0-6], times}, points, created:'YYYY-MM-DD', ...依類型的欄位}`
    - `type`：`check`／`options`／`ratio`／`number`／`time`／`text`／`list`
    - 依類型：`options:[{label,done}]`、`unit`、`target`、`dir:'ge'|'le'|'after'|'none'`、`steps`（快速加按鈕）、`mode:'frac'|'pct'`、`denom`、`fields:['名稱:單位']`、`presets`（清單標籤）、`minCount`、`labelHint`
    - `reminder` 欄位還留在舊資料裡，功能已經拿掉了
  - `rewards[]`：`{id, name, cost}`
  - `redeemed[]`：`{name, cost, date}`，兌換紀錄。點數餘額＝賺到的點數－這裡的 cost 加總
  - `theme`：`{accent:'teal'|…|'custom', custom:'#rrggbb', saved:[色碼], mode:''|'light'|'dark'}`
  - `goals`：`{'YYYY-MM': 月目標文字}`
  - `mig`：已經跑過的資料轉換旗標，目前只有 `ex:1`（把「跟練操」改成「運動」清單）
  - `rwSort`：`'custom'|'asc'|'desc'`
  - `lastBackup`：上次手動下載備份的 ISO 時間
- `d-YYYY-MM-DD`：一天一份，`{date:'YYYY-MM-DD', e:{...}}`
  - `e[habitId]`：當天的值。check＝`true`，options＝選項索引，number／ratio＝數字，time＝`'HH:MM'`，text＝字串，list＝`[{label, tag?, f:[數字...]}]`
  - `e.__r[habitId]`：**鎖定的結果** `{d: 是否完成, p: 得到的點數}`，每次改值時由 `relock()` 依當下的習慣設定寫入
  - `e.__log[habitId]`：數字類型當天每次加減的紀錄 `[{t:'HH:MM', a: 增減量, set?: 設定值}]`，用來顯示和復原

localStorage（連不到 Firebase 時）：key `habit-book-v1`，內容是 `{cfg, days}`，`days` 的格式跟上面的 `e` 一樣。

備份檔：`{app:'habit-book', v:1, exported, cfg, days}`。

### 點數鎖定

- 已做到：每次改某天的值，`relock()` 就把當下的完成結果和點數寫進 `__r`。`doneOn()`、`ptsOn()`、`earned()` 都優先讀 `__r`，所以之後改目標、點數，過去有 `__r` 的紀錄不會變。編輯習慣存檔前和刪除習慣前，`lockUnlocked()` 會先用**舊的**設定幫沒有 `__r` 的紀錄補鎖。
- 還有的缺口（已回報，還沒修）：
  1. 回到過去某天修改那天的值，會用**現在的**目標和點數重新鎖定那天，所以那天已經賺到的點數可能變多或變少。
  2. 編輯存檔時今天會依新設定重鎖，今天的點數會跟著改。今天應該不算「過去」，所以這可能是刻意的。

### 本機執行、測試、部署

- 本機執行：`app.js` 是 ES module，直接用 `file://` 開不起來，要開本機伺服器，例如在專案資料夾執行 `python -m http.server 8000`，再開 http://localhost:8000 。連的是正式的 Firebase 專案，登入後讀寫的是真實資料，測試時請用另一個帳號。
- 測試：沒有自動化測試。用瀏覽器開發者工具切到手機寬度（約 375px），淺色和深色模式都手動看過。
- 部署：GitHub Pages，`main` 分支的根目錄（repo `411262063/my_habit_book`），push 之後一兩分鐘生效。Firestore 安全規則在 Firebase Console 設定，內容見 README。

## 一定要遵守的規則

### 資料

- **不能讓現有的資料讀不到。**我的紀錄是真的在用的資料。改資料格式時，要寫成只執行一次的轉換（用旗標記錄已轉換過），舊欄位能留就留。
- **過去的點數是鎖住的。**每天完成一個習慣時，當下的完成結果和點數會記下來。之後改目標、改點數或刪除習慣，都不能回頭改到過去的結果和已經賺到的點數。
- **點數只加不扣。**沒做到不扣分。這是刻意的設計，不要加入懲罰或扣分機制。
- 會動到資料格式或資料讀寫的修改，部署前要先提醒我到「設定」下載備份檔。

### 刻意不做的事

- **提醒功能**：已經評估過，網頁在背景沒辦法主動通知，所以決定拿掉。不要再加回來。
- **LINE／Discord 連動**：評估過，不做。

## 跟我合作的方式

### 改之前

- **大的畫面改動**（新增頁面、改版面配置、改操作方式）：先用文字說明打算怎麼改，必要時附簡單的示意（例如文字畫的版面，或一個預覽用的 HTML），等我同意再動手。
- **小改動**（文字、間距、顏色微調、修 bug）：可以直接改，改完告訴我改了什麼。
- 需求不清楚時先問，不要猜。

### 改完之後

- 用手機寬度（約 375px）檢查畫面，淺色和深色模式都要看。
- 說清楚改了什麼、怎麼確認的、有沒有還沒測到的地方。

### Git

- 我用 TortoiseGit 管理版本。**不要 force push，不要改寫已經 push 的 commit 歷史。**
- commit 訊息主要用中文，技術名詞用英文沒關係，例如「修正 Firestore 同步時的 race condition」。
- 小改動可以直接 commit 到 `main`。大的功能、會動到資料格式的修改，請自己判斷要不要開分支，開了的話告訴我分支名稱，等我看過再合併。

## 設計

- 顏色和字體一律用 `style.css` 裡 `:root` 定義的變數，不要寫死顏色。主題色是使用者可以自己換的，寫死的顏色會跟主題色打架。
- 介面會刻意用不同的幾何形狀，例如六角形的點數、圓環進度、票券形的獎勵、圓形的日期，不要全部改回圓角矩形。

<!-- 設計風格之後會搭配一些 plugin 再調整，到時候再更新這一節。 -->
