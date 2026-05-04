/**
 * 一次性迁移脚本：创建 yutengz 用户并迁移旧数据
 *
 * 用法：node --experimental-sqlite --no-warnings=ExperimentalWarning src/migrate-user.js
 */
import { db, hashPassword, migrateOldData } from './db.js';

const USERNAME = 'yutengz';
const PASSWORD = '111';

// 检查用户是否已存在
const existing = db.prepare('SELECT id FROM users WHERE username = @username').get({ username: USERNAME });

if (existing) {
  console.log(`[迁移] 用户 "${USERNAME}" 已存在 (id=${existing.id})，跳过创建`);
  // 仍然尝试迁移旧数据
  const count = migrateOldData(existing.id);
  if (count) console.log(`[迁移] 已迁移 ${count} 条旧数据`);
  else console.log('[迁移] 无旧数据需要迁移');
} else {
  const { hash, salt } = hashPassword(PASSWORD);
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, salt) VALUES (@username, @hash, @salt)'
  ).run({ username: USERNAME, hash, salt });
  const userId = Number(result.lastInsertRowid);
  console.log(`[迁移] 已创建用户 "${USERNAME}" (id=${userId})`);

  const count = migrateOldData(userId);
  if (count) console.log(`[迁移] 已迁移 ${count} 条旧数据到用户 "${USERNAME}"`);
  else console.log('[迁移] 无旧数据需要迁移');
}

console.log('[迁移] 完成！');
