const bcrypt = require('bcryptjs');
const hash = '$2b$12$sJoIAHPzKgQA3LlEi9QwBulqK.U0Q6A7HFmsm5znwcpmue3mMDGfu';
console.log('Hash do banco:', hash);
console.log('Testando 13245678:', bcrypt.compareSync('13245678', hash));
console.log('Testando 12345678:', bcrypt.compareSync('12345678', hash));
