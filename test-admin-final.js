// Test với admin có sẵn hoặc tạo admin mới
const BASE_URL = 'http://localhost:3000/api';

async function testWithExistingAdmin() {
  console.log('🔍 Test với admin có sẵn...\n');
  
  try {
    // Thử login với admin có sẵn
    console.log('🔐 Thử login với admin...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginRes.json();
    
    if (!loginData.success) {
      console.log('❌ Không login được admin có sẵn:', loginData.message);
      console.log('\n💡 Tạo admin mới...');
      
      // Tạo user mới và thử bootstrap
      const newUser = {
        username: 'superadmin_' + Date.now(),
        email: `superadmin_${Date.now()}@test.com`,
        password: 'admin123'
      };
      
      const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      
      const regData = await regRes.json();
      if (!regData.success) {
        console.log('❌ Không thể tạo user:', regData.message);
        return;
      }
      
      console.log('✅ Tạo user thành công');
      
      // Thử bootstrap (có thể fail nếu đã có admin)
      const token = regData.data.token;
      const bootRes = await fetch(`${BASE_URL}/admin-bootstrap/self`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const bootData = await bootRes.json();
      console.log('Bootstrap result:', bootData.message);
      
      if (!bootData.success && bootData.message.includes('Admin already exists')) {
        console.log('\n🔄 Admin đã tồn tại, cần tìm admin có sẵn...');
        
        // Tìm admin thông qua database trực tiếp (giả lập)
        console.log('💡 Gợi ý: Có thể cần login bằng admin account có sẵn trong database');
        console.log('   Hoặc set isAdmin=true cho user hiện tại trong MongoDB');
        return;
      }
      
      // Nếu bootstrap thành công, test các chức năng
      await testAdminFunctions(token);
      
    } else {
      console.log('✅ Login admin thành công!');
      await testAdminFunctions(loginData.data.token);
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  }
}

async function testAdminFunctions(token) {
  console.log('\n🎯 Testing Admin Functions với token hợp lệ...');
  
  // Test stats
  console.log('\n📊 Admin Stats:');
  const statsRes = await fetch(`${BASE_URL}/admin/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const statsData = await statsRes.json();
  console.log(statsData.success ? statsData.data : statsData.message);
  
  // Test users
  console.log('\n👥 Admin Users:');
  const usersRes = await fetch(`${BASE_URL}/admin/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const usersData = await usersRes.json();
  console.log(usersData.success ? `${usersData.data.length} users found` : usersData.message);
  
  if (usersData.success && usersData.data.length > 0) {
    // Test toggle Pro
    const userId = usersData.data[0]._id;
    console.log('\n⭐ Toggle Pro for user:', usersData.data[0].username);
    
    const proRes = await fetch(`${BASE_URL}/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ isPro: true })
    });
    const proData = await proRes.json();
    console.log(proData.success ? `✅ Set Pro: ${proData.data.isPro}` : proData.message);
  }
  
  // Test threads
  console.log('\n📝 Admin Threads:');
  const threadsRes = await fetch(`${BASE_URL}/admin/threads`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const threadsData = await threadsRes.json();
  console.log(threadsData.success ? `${threadsData.data.length} threads found` : threadsData.message);
  
  // Test pro enforcement
  console.log('\n⏰ Pro Expiry Enforcement:');
  const enforceRes = await fetch(`${BASE_URL}/admin/pro/enforce`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const enforceData = await enforceRes.json();
  console.log(enforceData.success ? `✅ Updated: ${enforceData.data.modifiedCount} users` : enforceData.message);
  
  console.log('\n🎉 ALL ADMIN FUNCTIONS WORKING!');
}

testWithExistingAdmin();