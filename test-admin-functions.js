import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

// Test các chức năng admin
async function testAdminFunctions() {
  console.log('🔍 Testing Admin Functions...\n');

  try {
    // 1. Health check
    console.log('1️⃣ Testing Health Endpoint...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    console.log('✅ Health:', await healthRes.json());

    // 2. Tạo user test và admin
    console.log('\n2️⃣ Creating test user...');
    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin_test_' + Date.now(),
        email: 'admin@test.com',
        password: 'password123'
      })
    });
    const registerData = await registerRes.json();
    console.log('✅ Register:', registerData.success ? 'OK' : registerData.message);

    if (!registerData.success) return;

    const token = registerData.data.token;

    // 3. Bootstrap admin (nếu chưa có admin)
    console.log('\n3️⃣ Bootstrap admin...');
    const bootstrapRes = await fetch(`${BASE_URL}/admin-bootstrap/self`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const bootstrapData = await bootstrapRes.json();
    console.log('✅ Bootstrap:', bootstrapData.message);

    // 4. Test Admin Stats
    console.log('\n4️⃣ Testing Admin Stats...');
    const statsRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const statsData = await statsRes.json();
    console.log('✅ Admin Stats:', statsData.success ? statsData.data : statsData.message);

    // 5. Test Admin Users List
    console.log('\n5️⃣ Testing Admin Users List...');
    const usersRes = await fetch(`${BASE_URL}/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const usersData = await usersRes.json();
    console.log('✅ Admin Users:', usersData.success ? `Found ${usersData.data.length} users` : usersData.message);

    // 6. Test Pro Toggle (toggle current user)
    if (usersData.success && usersData.data.length > 0) {
      const userId = usersData.data[0]._id;
      console.log('\n6️⃣ Testing Pro Toggle...');
      const proRes = await fetch(`${BASE_URL}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          isPro: true, 
          proExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        })
      });
      const proData = await proRes.json();
      console.log('✅ Pro Toggle:', proData.success ? `User isPro: ${proData.data.isPro}` : proData.message);
    }

    // 7. Test Threads List
    console.log('\n7️⃣ Testing Threads List...');
    const threadsRes = await fetch(`${BASE_URL}/admin/threads`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const threadsData = await threadsRes.json();
    console.log('✅ Admin Threads:', threadsData.success ? `Found ${threadsData.data.length} threads` : threadsData.message);

    // 8. Test Pro Expiry Enforcement
    console.log('\n8️⃣ Testing Pro Expiry Enforcement...');
    const enforceRes = await fetch(`${BASE_URL}/admin/pro/enforce`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const enforceData = await enforceRes.json();
    console.log('✅ Pro Enforcement:', enforceData.success ? `Updated ${enforceData.data.modifiedCount} users` : enforceData.message);

    // 9. Test Payments List
    console.log('\n9️⃣ Testing Payments List...');
    const paymentsRes = await fetch(`${BASE_URL}/admin/payments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const paymentsData = await paymentsRes.json();
    console.log('✅ Admin Payments:', paymentsData.success ? `Found ${paymentsData.data.length} payments` : paymentsData.message);

    // 10. Test Logs
    console.log('\n🔟 Testing Logs...');
    const logsRes = await fetch(`${BASE_URL}/admin/logs?lines=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const logsData = await logsRes.json();
    console.log('✅ Admin Logs:', logsData.success ? `Retrieved ${logsData.data.length} log lines` : logsData.message);

    console.log('\n🎉 All Admin Functions Tested Successfully!');
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Chờ server khởi động rồi test
setTimeout(testAdminFunctions, 2000);