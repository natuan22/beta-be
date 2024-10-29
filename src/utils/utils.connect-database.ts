const sql = require('mssql');

const connectDB = async () => {
  return await sql.connect(
    `Server=${process.env.DB_HOST},1433;Database=PHANTICH;User Id=${process.env.DB_USERNAME};Password=${process.env.DB_PASSWORD};Encrypt=false;Request Timeout=30000`,
  );
};

export default connectDB;
