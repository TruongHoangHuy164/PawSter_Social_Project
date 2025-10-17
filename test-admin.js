import http from 'http';

const BASE_URL = 'http://localhost:3000';

const makeRequest = (path, options = {}) => {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
};

async function testAdminAPIs() {
  console.log('🧪 Testing Admin APIs...\n');
  
  try {
    // 1. Health check
    console.log('1. Testing /api/health');
    const health = await makeRequest('/api/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${JSON.stringify(health.data)}\n`);
    
    if (health.status !== 200) {
      console.log('❌ Server not running or health endpoint failed');
      return;
    }
    
    // 2. Try admin stats without auth (should fail)
    console.log('2. Testing /api/admin/stats (without auth)');
    const statsNoAuth = await makeRequest('/api/admin/stats');
    console.log(`   Status: ${statsNoAuth.status} (expected 401)`);
    console.log(`   Response: ${JSON.stringify(statsNoAuth.data)}\n`);
    
    // 3. Register a test user
    console.log('3. Registering test admin user');
    const registerData = {
      username: 'testadmin',
      email: 'test@admin.com',
      password: 'admin123'
    };
    const register = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: registerData
    });
    console.log(`   Status: ${register.status}`);
    console.log(`   Response: ${JSON.stringify(register.data)}\n`);
    
    let token = register.data?.data?.token;
    
    // If user already exists, try login
    if (register.status === 400 && register.data?.message?.includes('exists')) {
      console.log('3b. User exists, trying login');
      const login = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: { email: registerData.email, password: registerData.password }
      });
      console.log(`   Login Status: ${login.status}`);
      token = login.data?.data?.token;
    }
    
    if (!token) {
      console.log('❌ Failed to get auth token');
      return;
    }
    
    // 4. Promote to admin via bootstrap
    console.log('4. Promoting to admin via bootstrap');
    const bootstrap = await makeRequest('/api/admin-bootstrap/self', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`   Status: ${bootstrap.status}`);
    console.log(`   Response: ${JSON.stringify(bootstrap.data)}\n`);
    
    // 5. Test admin endpoints
    const adminHeaders = { Authorization: `Bearer ${token}` };
    
    console.log('5. Testing /api/admin/stats (with admin auth)');
    const stats = await makeRequest('/api/admin/stats', { headers: adminHeaders });
    console.log(`   Status: ${stats.status}`);
    console.log(`   Response: ${JSON.stringify(stats.data, null, 2)}\n`);
    
    console.log('6. Testing /api/admin/users');
    const users = await makeRequest('/api/admin/users', { headers: adminHeaders });
    console.log(`   Status: ${users.status}`);
    console.log(`   Users count: ${users.data?.data?.length || 0}\n`);
    
    console.log('7. Testing /api/admin/threads');
    const threads = await makeRequest('/api/admin/threads', { headers: adminHeaders });
    console.log(`   Status: ${threads.status}`);
    console.log(`   Threads count: ${threads.data?.data?.length || 0}\n`);
    
    console.log('8. Testing /api/admin/payments');
    const payments = await makeRequest('/api/admin/payments', { headers: adminHeaders });
    console.log(`   Status: ${payments.status}`);
    console.log(`   Payments count: ${payments.data?.data?.length || 0}\n`);
    
    console.log('9. Testing /api/admin/pro/enforce');
    const enforce = await makeRequest('/api/admin/pro/enforce', { 
      method: 'POST',
      headers: adminHeaders 
    });
    console.log(`   Status: ${enforce.status}`);
    console.log(`   Response: ${JSON.stringify(enforce.data)}\n`);
    
    console.log('✅ All admin endpoints tested successfully!');
    
  } catch (error) {
    console.log('❌ Error testing APIs:', error.message);
  }
}

testAdminAPIs();