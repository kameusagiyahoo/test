# Party Pocket

GitHub Pagesだけで動く、1〜8人向けのスマホ1台ゲーム集です。

## 方針

- 公開先: GitHub Pagesのみ
- PWA対応: ホーム画面追加 / standalone起動 / Service Workerオフラインキャッシュ
- バックエンド: なし
- 外部DB / Worker / WebSocket: なし
- 複数端末同期: なし
- プレイヤー名・Party設定・評価・Party途中状態をlocalStorageへ保存
- プレイテスト評価は4軸で端末内集計
- 完了したSingle / Partyラウンドを端末内のプレイ履歴として保存
- 1人ならSolo対応ゲーム、2〜8人ならスマホ1台を順番に回して遊ぶ
- Party Pocketの端末データをJSONでバックアップ / 復元可能
- よく使うプレイヤー構成を最大8グループ保存し、Quick Solo / Quick Partyで即開始
- Smart Party Builderが人数・履歴・評価から3/6/9ラウンドを自動構成
- 気に入ったParty構成をゲーム順ごと最大8件保存して再利用
- 完了PartyをRecap付きで最大50件保存し、ラウンドごとの勝者と得点推移を確認
- Stats + Party HistoryからPlayer Profile / Recordsを自動集計
- Achievements / Milestonesを履歴から自動判定し、進捗付きで表示
- Party RecapとPlayer Profileを端末内生成PNGとして共有可能
- Season Boardで月ごとの勝利数・Party優勝・MVP・前月差を表示
- Game Insightsでゲーム単位の実績・Playtest・Health根拠を統合表示
- Playtest Timelineで新規4軸評価を日時・モード・人数付きイベントとして保存
- Solo 3ゲームにEasy / Normal / Hardを追加し、難易度別自己ベストとDaily難易度を管理
- Solo Analyticsで難易度別の完走数・平均R・最短R・pt/Rを比較
- Contextual Playtest SegmentsでSingle/Party・Solo難易度別の4軸評価差を比較

## Games

### Solo compatible
- ◉ メモリー・フラッシュ — 数秒表示される数字列を覚えて再入力
- ⌁ ナンバー・ルート — 3×3盤面を4マス進み、合計を目標値へ合わせる
- ∷ パターン・コード — 数列の規則を見抜いて次の数字を4択で当てる

### Light / Social
- 🎯 シンクロ — 4択 / 自由回答の一致ゲーム
- 💣 21ボム+ — ランダム爆発位置 + PASS
- ⚡ 5秒チャレンジ+ — EASY / NORMAL / HARD
- 🌓 少数派 — A/B秘密投票。3人以上は少数派、2人は一致で得点
- 🎯 数字スナイパー — 平均の70%に近い数字を狙う
- 🚫 NGワード説明 — 3つの禁止ワードを避けてお題を説明
- ⏱️ 体内時計 — 表示なしで指定秒数を当てる
- 🃏 ギリギリ10 — 1〜5を引いて10を超えないギリギリを狙う

### Brain / Strategy
- ⌗ コードブレイカー — 4桁・重複なし。位置一致 / 数字一致と残り候補数から最大6手で推理
- ◇ 矛盾探し — A〜Dの4証言から、犯人と唯一の嘘つきを同時に特定
- ± 期待値チキンレース — 毎回変わる確率と損益、最終目標ボーナスを踏まえて3回判断
- ⌁ 数字オークション — 価値ごとの確率を読み、18点の予算を3回の秘密入札へ配分
- ▦ グリッド・ドミニオン — マス価値と隣接ボーナスを読み、公開盤面で先回りする陣取り
- ◫ リソース・シフト — 6資源を3案件へ秘密配分し、容量超過を避けながら高単価を狙う
- ▤ ポートフォリオ10 — 予算10で案件を組み、シナジー込みの最大価値を探索する
- ≋ シークエンス・デュエル — 攻め・守り・フェイントの3手順を事前にロックし、公開情報から残り手を読む
- ⋮ フロントライン — 1〜5の有限戦力を3戦線へ投入し、相手の残り札と戦線価値を読む
- Ⅴ プライオリティ5 — 5ラウンドの報酬順を先に見て、1〜5のカードをどこで使うか計画する
- ⌗ アイソレーション — 1マス移動するたび元マスを封鎖し、相手の合法手を削る
- ⇥ ゲートライン — 対岸への経路を維持しながら壁を置き、相手の進路を遠回りさせる
- △ トライアド・シフト — 3駒を配置・移動し、縦・横・斜めの3連を作る

## PWA / iPhone
- `manifest.webmanifest` を追加
- iPhone Safariでは共有 →「ホーム画面に追加」で独立アプリ風に起動
- Service WorkerでHTML / CSS / JavaScript / 24ゲームを事前キャッシュ
- 一度オンラインで読み込めば、基本ゲームはオフラインでも起動可能
- 更新版Service Workerが準備できた場合はホームに更新カードを表示
- GitHub Pagesの `/test/` 配下で動くよう相対パスのみ使用

## Data Vault
- Party Pocketが管理する `partyPocket...` localStorageキーをJSONへ書き出し
- iPhoneではWeb Share API対応時に共有シートから「ファイルに保存」等を利用可能
- 非対応環境ではJSONファイルとしてダウンロード
- 復元前に形式 / バージョン / サイズ / 既知JSONデータを検証
- 復元時はParty Pocket管理キーだけを置き換え、他のlocalStorageは触らない
- 全初期化もParty Pocket管理キーだけが対象
- PWA本体 / Service Worker / オフラインキャッシュは初期化対象外

## Player Groups / Quick Start
- 現在の1〜8人を名前付きグループとして最大8件保存
- 同名保存は既存グループを上書き
- ホームから1タップでメンバー構成を呼び出し
- 1人グループは `Quick Solo` で当日のDaily Soloを即開始
- 2人以上のグループは `Quick Party 3R` で保存済みPartyゲーム設定を使った3ラウンド戦を即開始
- 最近使ったグループを先に表示
- グループ情報はData Vaultバックアップへ自動的に含まれる

## Smart Party Builder
- 人数のおすすめ範囲を最優先で加点
- お気に入り / 高いPlaytest品質 / 健全なGame Healthを加点
- 同じメンバーで最近遊んだゲームを減点
- Game Healthの改善優先ゲームは強く減点し、要観察も軽く減点
- 選出済みゲームとカテゴリが被りすぎないよう多様性ボーナス
- 難易度も同じものだけに寄りすぎないよう軽く分散
- ホームからSmart 3R / 6R / 9Rを即開始
- Player GroupのQuick Party 3RもSmart構成を利用
- Party Setupの「Smart構成」で自動選択後に手動調整可能
- Game Catalogの検索・カテゴリ・難易度・時間条件からSmart Partyを作成可能
- Smart Party開始前にPreview画面を表示
- Previewで各ゲームの選出理由 / 推定時間 / 推奨人数を確認
- ゲーム単位でLock / 1本入替 / ↑↓による順番変更が可能
- Lockしたゲームを維持したまま残りだけ全部組み直せる

## Saved Parties
- Party完了画面から現在のゲームscheduleを名前付きで保存
- ゲームの集合だけでなく実際のプレイ順も保存
- 最大8件、同名保存は上書き
- ホームのSaved Partiesから同じ順番で即開始
- 管理画面から開始 / 削除
- Party完了画面の「もう一度」も直前の順番をそのまま再現
- Smart Party Previewの確定後もPreview表示順をそのまま実行
- Data Vaultバックアップへ自動的に含まれる

## Party Recap / History
- Party開始時に進行中RecapをlocalStorageへ保存
- 各ラウンド終了時にゲーム / 生スコア / Party pt / 累積Party pt / 勝者を記録
- 完走したPartyだけを最大50件のHistoryへ確定保存
- 途中離脱や破棄は完了履歴へ入れない
- Party終了画面に全ラウンドのRecapを表示
- MVP = ラウンド勝利数が最も多いプレイヤー
- 首位交代回数を算出
- Homeに直近3件のRecent Partiesを表示
- Party History一覧 → 詳細Recapを表示
- 過去履歴から同じ構成で再戦 / Saved Partyへ保存可能
- Data Vaultバックアップへ進行中・完了履歴とも自動的に含まれる

## Player Profiles / Records
- 新しい保存データは作らず、Local Stats + Party Historyから都度算出
- プレイヤー別に総試合数 / 勝利数 / 勝率 / 遊んだゲーム数を表示
- Party完走数 / Party勝利数 / MVP回数 / 累積Party ptを表示
- 得意ゲームTop3は勝数 → 勝率 → 試合数で並べ、2試合以上の実績を優先
- 対戦相手別に完了Partyの最終スコアを比較し、勝-分-敗を集計
- 直近5Partyのフォームを勝 / 分 / 敗で表示し、タップでRecapへ移動
- Local StatsのPlayers行からプロフィールを開ける
- Recordsとして最多勝 / 最高勝率 / Party最多勝 / MVP最多を表示
- 最高勝率Recordは最低5試合から表示

## Achievements / Milestones
- 新しい保存データは作らずPlayer Profileから毎回再計算
- 14種類の実績を用意
- 通算勝利 / 試合数 / Party優勝 / Party完走 / MVP / 累積Party pt / 遊んだゲーム数 / 複数ゲーム勝利 / 同じ相手との対戦数などで判定
- Homeに端末全体の解除数とAchievement画面への入口を表示
- Achievement Boardでプレイヤーごとの解除数を比較
- Player Profileに解除済みBadgeを表示
- 未解除の中から達成率が高いNext Milestonesを3件表示
- Progress barで現在値 / 目標値を表示
- 勝率そのものをAchievement条件には使わず、少数試合の偶然を実績化しない

## Share Cards
- Party終了画面からParty結果をPNGで共有
- Party History詳細から過去結果もPNG共有
- Player Profileを戦績 / Best Games / Achievements付きPNGとして共有
- 外部サービスやサーバーは使わず、端末内でSVG → Canvas → PNG生成
- iPhoneではWeb Share API対応時に共有シートへ渡す
- 共有非対応環境ではPNG保存へフォールバック
- 8人Partyでも画像下端を超えないよう、ラウンド表示件数を自動調整

## Season Board / Monthly Leaderboard
- 新しい保存形式は作らずStats + Party Historyを月単位でフィルタして集計
- 月間順位は 勝利数 → Party総合優勝 → MVP → 勝率 → 試合数 の順
- 月ごとに記録試合 / Party数 / players / 遊んだゲーム数を表示
- プレイヤーごとに勝数 / 勝率 / Party優勝 / MVP / Party ptを表示
- 前月の同一プレイヤーと比較して勝数差を表示
- 過去月を最大12か月タブで切り替え
- 上位3人をTOP 3として表示
- 月間順位から既存Player Profileへ移動可能

## Game Insights / Health Detail
- Game Guideからゲーム単位の分析画面を開ける
- Game Health一覧からも直接Insightsへ移動
- 完了試合数 / Single・Party比率 / 直近30日とその前30日のプレイ差を表示
- 何人プレイで遊ばれたかを人数別に集計
- プレイヤー別に試合数 / 勝利数 / 勝率を表示
- Playtest 4軸の累積平均と回答数を表示
- Game Healthのステータス / 警告理由 / 次の改善アクションを同画面に表示
- 直近10件の結果を表示
- Playtestの個別評価時刻はまだ保存していないため、評価の時系列トレンドは推測しない
- 新しい保存形式は作らず、既存Stats / Playtest / Healthから都度算出

## Playtest Timeline / Contextual Reviews
- v8.25以降に記録する4軸評価を個別イベントとして保存
- イベントには gameId / 4軸スコア / Single・Party / プレイヤー人数 / 日時を保持
- 最大300イベントをlocalStorageへ保存
- Game Insightsで直近30日とその前30日の4軸平均を比較
- Single / Party別の評価件数、人数コンテキスト、直近評価イベントを表示
- Playtest LabにもTimeline記録件数と30日件数を表示
- v8.24以前の累積平均はそのまま保持し、存在しない過去イベントは生成しない
- 新規TimelineイベントはData Vaultバックアップ対象

## Solo Analytics / Difficulty Records
- Solo完走時のdifficultyとclearRoundsをStatsへ追加保存
- 既存Stats形式と互換で、difficulty / clearRoundsは任意フィールド
- Game InsightsのSolo対応3ゲームにEasy / Normal / Hard比較を表示
- 難易度別に完走数 / 平均クリアラウンド / 最短クリア / 平均pt per round / 最長連続成功を表示
- 完走数と最短はSolo Progressを利用し、Stats 200件上限の影響を受けにくくする
- 平均R / pt per roundはv8.27以降にclearRoundsが実記録された完走だけで算出
- v8.26以前の1人Solo StatsはNormal件数として扱うが、ラウンド数は推測しない
- 1人Soloの勝率は完走時に必ず100%になるため、難易度比較指標としては表示しない

## Contextual Playtest Segments
- v8.25以降のPlaytest Eventをモード / Solo難易度で分割集計
- Single vs Partyで面白さ / 分かりやすさ / 頭を使う度 / 再プレイ意向を比較
- Solo対応ゲームではEasy / Normal / Hardの4軸平均を比較
- 各セグメントのレビュー件数を明示し、データがない区分は「—」表示
- Context Signalは比較する各セグメント2件以上 + 平均差1.0点以上でのみ表示
- 差が大きい軸を最大4件表示し、どのコンテキストで評価が下がっているかを示す
- 既存の累積Playtest平均やHealth判定は変更せず、Context Signalは補助的な改善材料として扱う
- 新しい保存形式は追加せず、既存Playtest Eventから都度算出

## Modes

### Solo Challenge
- Memory / Number Route / Pattern CodeでEasy / Normal / Hardを選択可能
- Memory: Easy 5桁・3.2秒 / Normal 6〜7桁・2.5秒 / Hard 8〜9桁・1.8秒
- Number Route: Easy 3マス・1〜6 / Normal 4マス・1〜8 / Hard 5マス・1〜9
- Pattern Code: Easy 基本加減算 / Normal 交互・差分 / Hard 等比・複合規則
- 難易度ごとに最短クリアラウンド / 最長連続成功 / 完走回数を分離保存
- 既存v8.25以前のSolo実績はNormalへ自動移行
- Daily Challengeはゲーム + 難易度を日替わりで指定し、Hardのみ5ラウンド以内、Easy/Normalは4ラウンド以内
- 1人 + Solo対応ゲームでは、5点到達までのラウンド数を記録
- ゲーム別に最短クリアラウンド / 最長連続成功 / 完走回数をlocalStorageへ保存
- 毎日1つのSoloゲームをDaily Challengeとして提示
- Dailyは4ラウンド以内に5点到達でクリア
- Daily連続クリア日数を保存
- 結果画面に今回ラウンド数・自己ベスト・連続成功を表示

### Single Game
1人でもSingleを利用できます。ゲームを選ぶと、まず詳細画面で目的・手順・勝ち方・具体例を確認できます。「このゲームを始める」からSingle Gameを開始し、先に5点取った人が勝利します。

### Game Health
- Local Stats + Playtest Labを統合してゲーム単位の改善シグナルを自動検出
- 検出項目:
  - 分かりやすさ低下
  - 面白さ低下
  - 再プレイ意向低下
  - 特定プレイヤーへの勝率偏り
  - よく遊ばれているのに評価不足
  - 未プレイ / 未評価
- 評価系は新4軸評価2件以上で判定
- 勝率偏りは5試合以上 + 対象プレイヤー4試合以上 + 勝率75%以上で判定
- 各警告に次の改善アクションを表示
- 改善優先 / 要観察 / データ収集中 / 健全で並べ替え

### Local Stats
- Singleは5点先取で完走した時に1試合として記録
- Partyは各ラウンド終了時に1試合として記録
- 途中離脱は記録しない
- プレイヤー別: 試合数 / 勝利数 / 勝率 / Single・Party内訳
- ゲーム別: プレイ回数 / Single・Party内訳 / 最多勝プレイヤー
- 最近の結果を最大20件表示
- 履歴本体は最大200試合をlocalStorageへ保存

### Playtest Lab
- プレイ後に1〜5で4軸評価
  - 面白さ
  - 分かりやすさ
  - 頭を使う度
  - もう一度遊びたい
- 2回以上の新評価があるゲームを「改善優先 / 要観察 / 好調」に分類
- 改善優先度は面白さ・分かりやすさ・再プレイ意向の平均で判定
- 頭を使う度は品質判定ではなくゲーム特性として表示
- 旧3択評価は再プレイ意向へ換算して引き継ぎ
- ホームのPlaytest Labから24ゲームを一覧比較

### Favorites / Recent
- 詳細画面からお気に入り登録 / 解除
- お気に入りはホームに専用セクション表示
- 実際に開始したゲームを最近遊んだ順で最大8件保存
- 詳細を開いただけではRecentには入りません
- すべてlocalStorageのみ

### Game Catalog
24ゲームをカテゴリ・検索で絞り込めます。各ゲームには難易度・目安時間・おすすめ人数を設定し、現在の参加人数に応じておすすめ3本も表示します。

自動選択:
- 現在人数におすすめだけ表示 ON/OFF
- 難易度: かるめ / 標準 / しっかり
- 時間: 3 / 5 / 8 / 10分以内
- 選択中のカテゴリ・検索条件も反映
- 「この条件で1本選ぶ」で候補からランダム選択

カテゴリ:
- すべて
- 軽い
- 会話
- 頭脳
- 戦略
- 先読み
- 完全情報
- 1人向け
- 2人向け

### Party Mode
Party Modeは2人以上で利用できます。3 / 6 / 9ラウンドを選択し、使用ゲームも自由に選べます。

プリセット:
- バランス
- 頭脳戦
- 戦略
- 先読み
- 完全情報
- 読み合い
- 会話中心
- 短時間

追加ゲームもゲーム選択画面から個別に選択できます。保存済みParty設定への新ゲーム追加はリリースごとの一度だけ行い、その後の除外設定は保持します。

ゲーム内の生スコアは各ラウンド終了時に順位化し、Party Pointへ変換します。

- 1位グループ: +3 Party pt
- 2位グループ: +2 Party pt
- 3位グループ: +1 Party pt
- 0点 / それ以下: +0

## Architecture

```text
index.html
manifest.webmanifest
sw.js
icon.svg
icon-maskable.svg
styles.css
strategy.css
src/
├ bootstrap.js
├ app.js
├ core/
│  ├ session.js
│  ├ preferences.js
│  ├ registry.js
│  ├ catalog.js
│  ├ game-guide.js
│  ├ stats.js
│  ├ health.js
│  ├ solo.js
│  ├ pwa.js
│  ├ backup.js
│  ├ groups.js
│  ├ recommender.js
│  ├ party-presets.js
│  ├ party-history.js
│  ├ player-profile.js
│  ├ achievements.js
│  ├ share-card.js
│  ├ season.js
│  ├ game-insights.js
│  ├ playtest-events.js
│  ├ solo-analytics.js
│  └ transport.js
└ games/
   ├ sync.js
   ├ bomb.js
   ├ five.js
   ├ minority.js
   ├ sniper.js
   ├ taboo.js
   ├ clock.js
   ├ ten.js
   ├ code.js
   ├ logic.js
   ├ ev.js
   ├ auction.js
   ├ grid.js
   ├ allocation.js
   ├ portfolio.js
   ├ sequence.js
   ├ frontline.js
   ├ priority.js
   ├ isolation.js
   ├ gate.js
   └ triad.js
```

`bootstrap.js` が追加ゲームをRegistryへ登録した後、既存 `app.js` を起動します。各ゲームは独立した `mount(ctx)` モジュールで、画面離脱時のcleanup関数を返せます。

## Tests

```bash
npm test
```

GitHub ActionsでPR / `main` push時にテストと主要JavaScriptの構文チェックを実行します。

## Deploy

`main` にマージすると既存のGitHub Pagesへ反映されます。
