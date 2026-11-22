/* Firebase 專案設定。
   到 https://console.firebase.google.com 建立一個免費專案後：
   專案設定（齒輪圖示）→ 一般 → 往下滑到「你的應用程式」→ 新增一個網頁應用程式（</> 圖示）
   → 會看到一段 firebaseConfig，把下面的值換成你自己的那組。

   這組設定不是密碼，可以放進 git／公開的網站裡沒關係——
   真正決定誰能讀寫資料的是 Firestore 的「安全規則」，見 README。
*/
export const firebaseConfig = {
  apiKey: "AIzaSyD9Dl-C5VaUZZg19-5KfcMrDi2Tlqd92pc",
  authDomain: "claude-my-habit-book.firebaseapp.com",
  projectId: "claude-my-habit-book",
  storageBucket: "claude-my-habit-book.firebasestorage.app",
  messagingSenderId: "558555068234",
  appId: "1:558555068234:web:e710336136a97f4b69b3b3"
};
