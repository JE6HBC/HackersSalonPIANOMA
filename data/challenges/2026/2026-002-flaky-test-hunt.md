---
id: '2026-002-flaky-test-hunt'
title: 'Flakyテストの原因を特定せよ'
level: 'intermediate'
category: 'debugging'
timeLimitSec: 420
tags:
  [
    'テスト',
    '非同期',
    'デバッグ',
  ]
author: ''
createdAt: '2026-09-22'
usedIn:
  [
    '2026-09-22',
  ]
license: 'CC-BY-4.0'
draft: false
---

## 問題

次のテストは10回に1〜2回落ちる。原因を特定し、**テスト側ではなく実装側**を直せ。
「なぜ落ちるのか」を1文で説明できること。

```js
// cache.js
const cache =
  new Map();

export async function getUser(
  id,
  fetchUser,
) {
  if (
    cache.has(
      id,
    )
  )
    return cache.get(
      id,
    );
  const user =
    await fetchUser(
      id,
    );
  cache.set(
    id,
    user,
  );
  return user;
}
```

```js
// cache.test.js
test('同じIDへの同時リクエストはfetchを1回しか呼ばない', async () => {
  let calls = 0;
  const fetchUser =
    async (
      id,
    ) => {
      calls++;
      await new Promise(
        (
          r,
        ) =>
          setTimeout(
            r,
            Math.random() *
              10,
          ),
      );
      return {
        id,
      };
    };

  await Promise.all(
    [
      getUser(
        'u1',
        fetchUser,
      ),
      getUser(
        'u1',
        fetchUser,
      ),
    ],
  );
  expect(
    calls,
  ).toBe(
    1,
  );
});
```

## 制約

- `cache.test.js` は1文字も変更しないこと
- 外部ライブラリ不可

## 評価基準

| 観点         | 配点 | 説明                           |
| :----------- | ---: | :----------------------------- |
| 原因の説明   |   40 | 1文で正確に言えているか        |
| 修正の正しさ |   40 | テストが100回連続で通るか      |
| 副作用       |   20 | 失敗時にキャッシュを汚さないか |

## ヒント

- `await` の前後で、他のタスクが割り込める瞬間がどこにあるか数えてみる。

## 模範回答

```js
// cache.js
const cache =
  new Map(); // id -> Promise<User>

export async function getUser(
  id,
  fetchUser,
) {
  const cached =
    cache.get(
      id,
    );
  if (
    cached
  )
    return cached;

  const pending =
    fetchUser(
      id,
    ).catch(
      (
        err,
      ) => {
        cache.delete(
          id,
        ); // 失敗したPromiseを残さない
        throw err;
      },
    );
  cache.set(
    id,
    pending,
  );
  return pending;
}
```

## 解説

**原因（1文）:** 「値」をキャッシュしているため、1件目の `await fetchUser(id)` が解決するまで
`cache.has(id)` が false のままで、その隙に2件目が同じ `fetchUser` を呼んでしまう。

いわゆる **cache stampede / thundering herd** の最小再現。直し方は「値ではなく
**進行中のPromiseそのもの**をキャッシュする」。これで2件目は同じPromiseを待つだけになる。

もう一つの罠が `catch` のほう。Promiseをキャッシュすると、失敗したPromiseが永久に残って
以後の呼び出しが全部同じエラーを返すようになる。失敗時に `cache.delete(id)` するところまでが
セットで、評価基準の「副作用」20点はここを見ている。

AIに投げるときは「Flakyなので直して」ではなく、
「このテストは変更不可。同一IDの同時呼び出しでfetchが2回走るのを防ぎたい」と
**不変条件**を渡すと一発で通る。
