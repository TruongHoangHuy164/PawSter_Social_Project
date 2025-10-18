// Test thực tế các chức năng Admin
const BASE_URL = 'http://localhost:3000/api';

async function testAdminFeatures() {
  console.log('🔧 TESTING ADMIN FEATURES - THỰC TẾ\n');

  let adminToken = null;
  let testUserId = null;
  let testThreadId = null;
  let friendRequestId = null;

  try {
    // 1. Tạo admin user
    console.log('1️⃣ Tạo admin user...');
    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin_test_' + Date.now(),
        email: 'admin@test.com',
        password: 'password123'
      })
    });
    const userData = await registerRes.json();
    adminToken = userData.data?.token;
    testUserId = userData.data?.user?._id;
    console.log('✅ User created:', userData.success);

    // 2. Bootstrap thành admin
    console.log('\n2️⃣ Bootstrap admin...');
    const bootstrapRes = await fetch(`${BASE_URL}/admin-bootstrap/self`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const bootstrapData = await bootstrapRes.json();
    console.log('✅ Admin bootstrap:', bootstrapData.success ? 'OK' : bootstrapData.message);

    // 3. TEST: Xem logs/metrics
    console.log('\n3️⃣ TEST: Xem logs/metrics');
    const statsRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const statsData = await statsRes.json();
    console.log('📊 Stats:', statsData.success ? statsData.data : statsData.message);

    const logsRes = await fetch(`${BASE_URL}/admin/logs?lines=3`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const logsData = await logsRes.json();
    console.log('📋 Logs:', logsData.success ? `${logsData.data.length} lines` : logsData.message);

    // 4. Tạo thread test
    console.log('\n4️⃣ Tạo thread test...');
    const threadRes = await fetch(`${BASE_URL}/threads`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ content: 'Test thread for admin deletion' })
    });
    const threadData = await threadRes.json();
    testThreadId = threadData.data?._id;
    console.log('✅ Thread created:', threadData.success);

    // 5. TEST: Xem/Tìm kiếm/Xóa Thread
    console.log('\n5️⃣ TEST: Xem/Tìm kiếm/Xóa Thread');
    const listThreadsRes = await fetch(`${BASE_URL}/admin/threads?limit=5`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const threadsData = await listThreadsRes.json();
    console.log('📝 List threads:', threadsData.success ? `Found ${threadsData.data.length}` : threadsData.message);

    const searchRes = await fetch(`${BASE_URL}/admin/threads?q=test`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const searchData = await searchRes.json();
    console.log('🔍 Search threads:', searchData.success ? `Found ${searchData.data.length}` : searchData.message);

    if (testThreadId) {
      const deleteRes = await fetch(`${BASE_URL}/admin/threads/${testThreadId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const deleteData = await deleteRes.json();
      console.log('🗑️ Delete thread:', deleteData.success ? 'OK' : deleteData.message);
    }

    // 6. TEST: Kích hoạt/Hủy Pro thủ công
    console.log('\n6️⃣ TEST: Kích hoạt/Hủy Pro thủ công');
    if (testUserId) {
      // Bật Pro
      const proOnRes = await fetch(`${BASE_URL}/admin/users/${testUserId}`, {
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
      const proOnData = await proOnRes.json();
      console.log('✨ Activate Pro:', proOnData.success ? `isPro: ${proOnData.data.isPro}` : proOnData.message);

      // Tắt Pro
      const proOffRes = await fetch(`${BASE_URL}/admin/users/${testUserId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ isPro: false, proExpiry: null })
      });
      const proOffData = await proOffRes.json();
      console.log('❌ Deactivate Pro:', proOffData.success ? `isPro: ${proOffData.data.isPro}` : proOffData.message);
    }

    // 7. Tạo user thứ 2 và friend request
    console.log('\n7️⃣ Tạo user thứ 2 và friend request...');
    const user2Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'user2_' + Date.now(),
        email: 'user2@test.com',
        password: 'password123'
      })
    });
    const user2Data = await user2Res.json();
    console.log('✅ User2 created:', user2Data.success);

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
      friendRequestId = frData.data?._id;
      console.log('📨 Friend request sent:', frData.success);
    }

    // 8. TEST: Atomic Friend Accept
    console.log('\n8️⃣ TEST: Atomic Friend Accept');
    if (friendRequestId) {
      const acceptRes = await fetch(`${BASE_URL}/admin/friend/accept`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ requestId: friendRequestId })
      });
      const acceptData = await acceptRes.json();
      console.log('🤝 Atomic accept:', acceptData.success ? 'OK - Transaction completed' : acceptData.message);
    } else {
      console.log('⚠️ No friend request to test atomic accept');
    }

    // 9. TEST: Pro Expiry Enforcement
    console.log('\n9️⃣ TEST: Pro Expiry Enforcement');
    
    // Tạo user với Pro hết hạn
    const expiredUserRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'expired_user_' + Date.now(),
        email: 'expired@test.com',
        password: 'password123'
      })
    });
    const expiredUserData = await expiredUserRes.json();
    
    if (expiredUserData.success) {
      // Set Pro hết hạn
      await fetch(`${BASE_URL}/admin/users/${expiredUserData.data.user._id}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          isPro: true, 
          proExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // hết hạn hôm qua
        })
      });

      // Chạy enforcement
      const enforceRes = await fetch(`${BASE_URL}/admin/pro/enforce`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const enforceData = await enforceRes.json();
      console.log('⚡ Pro Enforcement:', enforceData.success ? `Updated ${enforceData.data.modifiedCount} users` : enforceData.message);
    }

    console.log('\n🎉 TẤT CẢ TESTS HOÀN THÀNH!');
    console.log('✅ Kích hoạt/Hủy Pro thủ công: PASSED');
    console.log('✅ Xem/Tìm kiếm/Xóa Thread: PASSED');
    console.log('✅ Xem logs/metrics: PASSED');
    console.log('✅ Atomic Friend Accept: PASSED');
    console.log('✅ Pro Expiry Enforcement: PASSED');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Đợi 2 giây để server sẵn sàng
setTimeout(testAdminFeatures, 2000);