const fs = require('fs');
const path = require('path');

console.log('🚂 Railway Environment Setup Helper');
console.log('====================================');

// Railway credentials from the dashboard screenshot
const railwayCredentials = {
  // Primary URL (use this one first)
  MYSQL_URL: 'mysql://root:cLytbcVXOiloQxifsSqXyvrvyeNvIhSV@mysql.railway.internal:3306/railway',
  
  // Alternative public URL (if internal doesn't work)
  MYSQL_PUBLIC_URL: 'mysql://root:cLytbcVXOiloQxifsSqXyvrvyeNvIhSV@crossover.proxy.rlwy.net:14951/railway',
  
  // Individual variables (fallback)
  MYSQLHOST: 'mysql.railway.internal',
  MYSQLUSER: 'root',
  MYSQLPASSWORD: 'cLytbcVXOiloQxifsSqXyvrvyeNvIhSV',
  MYSQLDATABASE: 'railway',
  MYSQLPORT: '3306',
  
  // Alternative external host
  DB_HOST: 'crossover.proxy.rlwy.net',
  DB_PORT: '14951',
  
  // Application settings
  JWT_SECRET: '3ab38dda4c23b0ae1b004bd4ecfdb4fa68c4127085df5fbd797e4301ea61c8cfe1156c3594d21d912adfb3fd4f',
  PORT: '5000'
};

const envPath = path.join(__dirname, '.env');

function createEnvFile() {
  console.log('\n📝 Creating .env file with Railway credentials...');
  
  const envContent = `# Railway MySQL Configuration
# Primary connection URL (recommended)
MYSQL_URL=${railwayCredentials.MYSQL_URL}

# Alternative public URL (if internal fails)
# MYSQL_PUBLIC_URL=${railwayCredentials.MYSQL_PUBLIC_URL}

# Individual Railway variables (fallback)
MYSQLHOST=${railwayCredentials.MYSQLHOST}
MYSQLUSER=${railwayCredentials.MYSQLUSER}
MYSQLPASSWORD=${railwayCredentials.MYSQLPASSWORD}
MYSQLDATABASE=${railwayCredentials.MYSQLDATABASE}
MYSQLPORT=${railwayCredentials.MYSQLPORT}

# External host (for development/testing)
DB_HOST=${railwayCredentials.DB_HOST}
DB_PORT=${railwayCredentials.DB_PORT}
DB_USER=${railwayCredentials.MYSQLUSER}
DB_PASSWORD=${railwayCredentials.MYSQLPASSWORD}
DB_NAME=${railwayCredentials.MYSQLDATABASE}

# Application settings
JWT_SECRET=${railwayCredentials.JWT_SECRET}
PORT=${railwayCredentials.PORT}
NODE_ENV=production
`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!');
    console.log('📍 Location:', envPath);
    
    console.log('\n🔧 Configuration Summary:');
    console.log('- Primary URL: Railway internal network');
    console.log('- Fallback: External proxy URL');
    console.log('- Individual variables: Available as backup');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create .env file:', error.message);
    return false;
  }
}

function showInstructions() {
  console.log('\n📋 Next Steps:');
  console.log('1. ✅ .env file has been created with Railway credentials');
  console.log('2. 🔄 Restart your server: npm start');
  console.log('3. 🚀 Deploy to Railway with the new configuration');
  
  console.log('\n🌐 For Railway deployment:');
  console.log('Make sure these environment variables are set in Railway:');
  Object.entries(railwayCredentials).forEach(([key, value]) => {
    if (key !== 'MYSQLPASSWORD' && key !== 'JWT_SECRET') {
      console.log(`- ${key}=${value}`);
    } else {
      console.log(`- ${key}=****** (set in Railway dashboard)`);
    }
  });
}

function checkExistingEnv() {
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists');
    console.log('Creating backup...');
    
    try {
      const backup = envPath + '.backup.' + Date.now();
      fs.copyFileSync(envPath, backup);
      console.log('✅ Backup created:', backup);
      return true;
    } catch (error) {
      console.error('❌ Failed to create backup:', error.message);
      return false;
    }
  }
  return true;
}

// Main execution
if (checkExistingEnv()) {
  if (createEnvFile()) {
    showInstructions();
  }
} else {
  console.error('❌ Setup failed due to backup error');
} 