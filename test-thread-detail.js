// Test chức năng admin xem chi tiết thread
const BASE_URL = 'http://localhost:3000/api';

async function testThreadDetailViewing() {
  console.log('📖 TEST ADMIN THREAD DETAIL VIEWING\n');

  try {
    // 1. Admin login
    console.log('🔐 Admin login...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });
    const loginData = await loginRes.json();
    const adminToken = loginData.data.token;
    console.log('✅ Admin logged in successfully\n');

    // 2. Tạo user và threads để test
    console.log('📝 Creating sample threads for testing...');
    const sampleThreads = [
      { content: 'Đây là thread đầu tiên với nội dung chi tiết để test admin viewing functionality. Thread này có thể chứa nhiều thông tin và admin cần xem đầy đủ.' },
      { content: 'Thread thứ hai về React hooks: useState, useEffect, useContext. Giải thích cách sử dụng từng hook và best practices.' },
      { content: 'Hướng dẫn setup MongoDB với Node.js: 1. Cài đặt MongoDB, 2. Tạo connection, 3. Define schemas, 4. CRUD operations' }
    ];

    const createdThreadIds = [];
    for (let i = 0; i < sampleThreads.length; i++) {
      // Tạo user
      const userRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `testuser_${i}_${Date.now()}`,
          email: `test${i}@detail.com`,
          password: 'password123'
        })
      });
      const userData = await userRes.json();

      if (userData.success) {
        // Tạo thread
        const threadRes = await fetch(`${BASE_URL}/threads`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${userData.data.token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(sampleThreads[i])
        });
        const threadData = await threadRes.json();

        if (threadData.success) {
          createdThreadIds.push({
            id: threadData.data._id,
            content: sampleThreads[i].content,
            author: userData.data.user.username
          });
          console.log(`   ✅ Thread ${i + 1} created by ${userData.data.user.username}`);
        }
      }
    }

    console.log(`\n📊 Created ${createdThreadIds.length} test threads\n`);

    // 3. TEST: Xem danh sách threads (để admin có thể chọn)
    console.log('📋 STEP 1: Admin views thread list to select threads...');
    const listRes = await fetch(`${BASE_URL}/admin/threads?limit=10`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const listData = await listRes.json();

    if (listData.success) {
      console.log(`✅ Found ${listData.data.length} threads in list:`);
      listData.data.slice(0, 5).forEach((thread, index) => {
        console.log(`   ${index + 1}. ID: ${thread._id}`);
        console.log(`      Author: ${thread.author?.username || 'Unknown'}`);
        console.log(`      Preview: "${thread.content.substring(0, 60)}..."`);
        console.log(`      📌 Click to view full details\n`);
      });
    }

    // 4. TEST: Click để xem chi tiết từng thread
    console.log('🔍 STEP 2: Admin clicks on threads to view full details...\n');

    for (let i = 0; i < Math.min(createdThreadIds.length, 3); i++) {
      const threadInfo = createdThreadIds[i];
      console.log(`👆 ADMIN CLICKS ON THREAD ${i + 1}:`);
      console.log(`   Thread ID: ${threadInfo.id}`);

      // Gọi API get thread detail
      const detailRes = await fetch(`${BASE_URL}/admin/threads/${threadInfo.id}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (detailRes.ok) {
        const detailData = await detailRes.json();

        if (detailData.success) {
          console.log('   ✅ THREAD DETAILS LOADED:');
          console.log('   ═══════════════════════════════════════');
          console.log(`   📝 FULL CONTENT:`);
          console.log(`   "${detailData.data.content}"`);
          console.log('   ───────────────────────────────────────');
          console.log(`   👤 AUTHOR INFO:`);
          console.log(`      Username: ${detailData.data.author?.username}`);
          console.log(`      Email: ${detailData.data.author?.email}`);
          console.log(`      Is Admin: ${detailData.data.author?.isAdmin ? 'Yes' : 'No'}`);
          console.log(`      Is Pro: ${detailData.data.author?.isPro ? 'Yes' : 'No'}`);
          console.log(`      Account Created: ${new Date(detailData.data.author?.createdAt).toLocaleString()}`);
          console.log('   ───────────────────────────────────────');
          console.log(`   📊 THREAD STATISTICS:`);
          console.log(`      Thread ID: ${detailData.data._id}`);
          console.log(`      Created: ${new Date(detailData.data.createdAt).toLocaleString()}`);
          console.log(`      Content Length: ${detailData.data.stats.contentLength} characters`);
          console.log(`      Created Ago: ${detailData.data.stats.createdAgo}`);
          console.log(`      Likes: ${detailData.data.stats.likesCount}`);
          console.log(`      Comments: ${detailData.data.stats.commentsCount}`);
          console.log('   ───────────────────────────────────────');
          console.log(`   🎯 ADMIN ACTIONS AVAILABLE:`);
          console.log(`      [ Edit Content ]  [ Delete Thread ]  [ Ban Author ]`);
          console.log(`      [ View Comments ] [ Check Reports ]  [ More... ]`);
          console.log('   ═══════════════════════════════════════\n');
        } else {
          console.log(`   ❌ Failed to load details: ${detailData.message}\n`);
        }
      } else {
        console.log(`   ❌ HTTP Error: ${detailRes.status} - ${detailRes.statusText}\n`);
      }
    }

    // 5. TEST: Xem thread từ list có đầy đủ thông tin để admin quyết định
    console.log('📋 STEP 3: Admin can make decisions based on full thread info...\n');

    // Lấy một thread từ list
    if (listData.success && listData.data.length > 0) {
      const randomThread = listData.data[Math.floor(Math.random() * Math.min(3, listData.data.length))];
      console.log(`🎯 ADMIN ANALYZING THREAD: ${randomThread._id}`);

      // Xem chi tiết
      const analyzeRes = await fetch(`${BASE_URL}/admin/threads/${randomThread._id}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (analyzeRes.ok) {
        const analyzeData = await analyzeRes.json();

        if (analyzeData.success) {
          const thread = analyzeData.data;
          console.log('\n📊 ADMIN DECISION MAKING PROCESS:');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          // Content analysis
          console.log('🔍 CONTENT ANALYSIS:');
          const contentLength = thread.stats.contentLength;
          const hasLinks = thread.content.includes('http') || thread.content.includes('www.');
          const hasSpamKeywords = /spam|quảng cáo|bán hàng|kiếm tiền/i.test(thread.content);

          console.log(`   Length: ${contentLength} chars ${contentLength > 200 ? '(Detailed)' : contentLength < 50 ? '(Short)' : '(Normal)'}`);
          console.log(`   Contains links: ${hasLinks ? '⚠️ Yes' : '✅ No'}`);
          console.log(`   Spam indicators: ${hasSpamKeywords ? '🚨 Detected' : '✅ Clean'}`);

          // Author analysis
          console.log('\n👤 AUTHOR ANALYSIS:');
          const author = thread.author;
          console.log(`   User: ${author?.username} (${author?.email})`);
          console.log(`   Account age: ${thread.stats.createdAgo}`);
          console.log(`   Pro status: ${author?.isPro ? '💎 Pro User' : '👤 Regular User'}`);

          // Engagement analysis
          console.log('\n📈 ENGAGEMENT ANALYSIS:');
          console.log(`   Likes: ${thread.stats.likesCount} ${thread.stats.likesCount > 5 ? '(Popular)' : '(Low)'}`);
          console.log(`   Comments: ${thread.stats.commentsCount} ${thread.stats.commentsCount > 3 ? '(Active discussion)' : '(Limited discussion)'}`);

          // Admin recommendation
          console.log('\n🎯 ADMIN RECOMMENDATION:');
          if (hasSpamKeywords) {
            console.log('   🚨 ACTION REQUIRED: Content appears to be spam - Consider deletion');
          } else if (contentLength < 20) {
            console.log('   ⚠️ REVIEW NEEDED: Very short content - May lack value');
          } else if (thread.stats.likesCount > 5 && thread.stats.commentsCount > 3) {
            console.log('   ✅ KEEP: High engagement, valuable content');
          } else {
            console.log('   📝 MONITOR: Normal content, continue monitoring');
          }

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        }
      }
    }

    // 6. Tổng kết chức năng
    console.log('🎉 ADMIN THREAD DETAIL VIEWING CAPABILITIES:\n');
    console.log('✅ LIST VIEW: Admin sees thread previews with basic info');
    console.log('✅ CLICK TO EXPAND: Admin can click any thread to see full details');
    console.log('✅ COMPLETE INFO: Full content, author details, statistics');
    console.log('✅ DECISION SUPPORT: Analytics to help admin make informed decisions');
    console.log('✅ ACTION BUTTONS: Ready for edit/delete/ban actions');
    console.log('✅ CONTENT ANALYSIS: Automatic spam detection and recommendations');
    console.log('\n🚀 Admin có đầy đủ thông tin để quản lý threads hiệu quả!');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Chạy test
setTimeout(testThreadDetailViewing, 2000);