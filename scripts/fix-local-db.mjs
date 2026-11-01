import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('backend/data/littlekrishna.db');
db.prepare("UPDATE content SET is_published = 0 WHERE access_type = 'restricted'").run();
db.prepare("UPDATE announcements SET kind = 'community' WHERE id = 'a2'").run();
db.prepare("UPDATE announcements SET kind = 'supporter' WHERE id = 'a3'").run();
console.log(db.prepare('SELECT COUNT(*) AS n FROM content WHERE is_published = 1').get());
