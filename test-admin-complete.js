// Test kiểm tra admin status và thực hiện các tests
const BASE_URL = 'http://localhost:3000/api';

async function testWithExistingAdmin() {
  console.log('🔧 KIỂM TRA ADMIN FUNCTIONS\n');

  try {
    // Tạo một user mới và kiểm tra xem có thể bootstrap thành admin không
    console.log('1️⃣ Tạo user mới...');
    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser_' + Date.now(),
        email: 'test@example.com',
        password: 'password123'
      })
    });
    const userData = await registerRes.json();
    console.log('✅ User created:', userData.success);
    
    if (!userData.success) {
      throw new Error('Failed to create user');
    }

    const token = userData.data.token;
    const userId = userData.data.user._id;

    // Kiểm tra bootstrap admin
    console.log('\n2️⃣ Kiểm tra bootstrap admin...');
    const bootstrapRes = await fetch(`${BASE_URL}/admin-bootstrap/self`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const bootstrapData = await bootstrapRes.json();
    console.log('Bootstrap result:', bootstrapData.message);

    // Nếu đã có admin, tìm user admin hiện tại
    if (bootstrapData.message === 'Admin already exists') {
      console.log('\n3️⃣ Tìm admin hiện tại...');
      
      // Thử đăng nhập với các tài khoản có thể là admin
      const adminCandidates = [
        { email: 'admin@example.com', password: 'admin123' },
        { username: 'admin', password: 'admin123' },
        { email: 'admin@test.com', password: 'password123' }
      ];

      let adminToken = null;
      for (const candidate of adminCandidates) {
        try {
          const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(candidate)
          });
          const loginData = await loginRes.json();
          
          if (loginData.success) {
            // Kiểm tra xem user này có phải admin không
            const testRes = await fetch(`${BASE_URL}/admin/stats`, {
              headers: { 'Authorization': `Bearer ${loginData.data.token}` }
            });
            
            if (testRes.status === 200) {
              adminToken = loginData.data.token;
              console.log('✅ Tìm thấy admin token:', candidate.email || candidate.username);
              break;
            }
          }
        } catch (e) {
          // Ignore login errors
        }
      }

      if (!adminToken) {
        console.log('❌ Không tìm thấy admin token. Sẽ test với user thường.');
        adminToken = token; // Use regular user token để xem error messages
      }

      // Test các chức năng admin
      await testAdminFunctions(adminToken, userId);
    } else {
      // User mới thành công bootstrap thành admin
      console.log('✅ User mới đã trở thành admin');
      await testAdminFunctions(token, userId);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testAdminFunctions(adminToken, testUserId) {
  console.log('\n4️⃣ TEST CÁC CHỨC NĂNG ADMIN:\n');

  // 1. Xem logs/metrics
  console.log('📊 TEST: Xem logs/metrics');
  try {
    const statsRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const statsData = await statsRes.json();
    console.log('  Stats:', statsData.success ? `✅ ${JSON.stringify(statsData.data)}` : `❌ ${statsData.message}`);

    const logsRes = await fetch(`${BASE_URL}/admin/logs?lines=2`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const logsData = await logsRes.json();
    console.log('  Logs:', logsData.success ? `✅ ${logsData.data.length} lines` : `❌ ${logsData.message}`);
  } catch (e) {
    console.log('  ❌ Error:', e.message);
  }

  // 2. Kích hoạt/Hủy Pro thủ công
  console.log('\n✨ TEST: Kích hoạt/Hủy Pro thủ công');
  try {
    const proRes = await fetch(`${BASE_URL}/admin/users/${testUserId}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        isPro: true, 
        proExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
      })
    });
    const proData = await proRes.json();
    console.log('  Pro activation:', proData.success ? `✅ isPro: ${proData.data.isPro}` : `❌ ${proData.message}`);
  } catch (e) {
    console.log('  ❌ Error:', e.message);
  }

  // 3. Tạo và quản lý threads
  console.log('\n📝 TEST: Tạo và quản lý threads');
  try {
    // Tạo thread test
    const createRes = await fetch(`${BASE_URL}/threads`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ content: 'Test thread cho admin' })
    });
    const createData = await createRes.json();
    console.log('  Create thread:', createData.success ? '✅ Created' : `❌ ${createData.message}`);

    // List threads
    const listRes = await fetch(`${BASE_URL}/admin/threads?limit=3`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const listData = await listRes.json();
    console.log('  List threads:', listData.success ? `✅ Found ${listData.data.length}` : `❌ ${listData.message}`);

    // Search threads
    const searchRes = await fetch(`${BASE_URL}/admin/threads?q=test`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const searchData = await searchRes.json();
    console.log('  Search threads:', searchData.success ? `✅ Found ${searchData.data.length}` : `❌ ${searchData.message}`);

    // Delete thread nếu có
    if (createData.success && createData.data._id) {
      const deleteRes = await fetch(`${BASE_URL}/admin/threads/${createData.data._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const deleteData = await deleteRes.json();
      console.log('  Delete thread:', deleteData.success ? '✅ Deleted' : `❌ ${deleteData.message}`);
    }
  } catch (e) {
    console.log('  ❌ Error:', e.message);
  }

  // 4. Pro Expiry Enforcement
  console.log('\n⚡ TEST: Pro Expiry Enforcement');
  try {
    const enforceRes = await fetch(`${BASE_URL}/admin/pro/enforce`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const enforceData = await enforceRes.json();
    console.log('  Enforcement:', enforceData.success ? `✅ Updated ${enforceData.data.modifiedCount} users` : `❌ ${enforceData.message}`);
  } catch (e) {
    console.log('  ❌ Error:', e.message);
  }

  // 5. Atomic Friend Accept (cần 2 users)
  console.log('\n🤝 TEST: Atomic Friend Accept');
  try {
    // Tạo user thứ 2
    const user2Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'friend_' + Date.now(),
        email: 'friend@test.com',
        password: 'password123'
      })
    });
    const user2Data = await user2Res.json();

    if (user2Data.success) {
      // Gửi friend request
      const frRes = await fetch(`${BASE_URL}/users/friend-request`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${user2Data.data.token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ targetUserId: testUserId })
      });
      const frData = await frRes.json();

      if (frData.success) {
        // Admin accept atomic
        const acceptRes = await fetch(`${BASE_URL}/admin/friend/accept`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ requestId: frData.data._id })
        });
        const acceptData = await acceptRes.json();
        console.log('  Atomic accept:', acceptData.success ? '✅ Transaction completed' : `❌ ${acceptData.message}`);
      } else {
        console.log('  Friend request failed:', frData.message);
      }
    } else {
      console.log('  User2 creation failed:', user2Data.message);
    }
  } catch (e) {
    console.log('  ❌ Error:', e.message);
  }

  console.log('\n🎉 HOÀN THÀNH TẤT CẢ TESTS!');
}

// Chạy test
testWithExistingAdmin();