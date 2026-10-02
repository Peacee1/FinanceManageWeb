const db = require('../config/db');
const sharedFields = ['monthly_budgets', 'budget_settings', 'bank_saving', 'investment_income', 'custom_normal_saving', 'custom_bank_saving_total', 'user_goal', 'custom_categories', 'separate_personal_wallets'];
async function familySettings(userId, client = db) {
  return (await client.query('SELECT f.settings FROM users u JOIN families f ON f.id=u.family_id WHERE u.id=$1', [userId])).rows[0]?.settings;
}
module.exports = { sharedFields, familySettings };
