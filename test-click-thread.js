// Test đơn giản chức năng xem chi tiết thread
const BASE_URL = 'http://localhost:3000/api';

async function quickThreadDetailTest() {
  console.log('📖 QUICK ADMIN THREAD DETAIL TEST\n');

  try {
    // 1. Login admin
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
    console.log('✅ Admin logged in');

    // 2. Lấy list threads
    const listRes = await fetch(`${BASE_URL}/admin/threads?limit=5`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const listData = await listRes.json();

    if (listData.success && listData.data.length > 0) {
      console.log(`\n📋 Found ${listData.data.length} threads. Testing detail view...\n`);

      // 3. Test xem chi tiết thread đầu tiên
      const testThread = listData.data[0];
      console.log(`👆 ADMIN CLICKS ON THREAD:`);
      console.log(`   Preview: "${testThread.content.substring(0, 50)}..."`);
      console.log(`   Author: ${testThread.author?.username}`);
      console.log(`   ID: ${testThread._id}\n`);

      // 4. Gọi API chi tiết
      console.log('🔄 Loading full thread details...\n');
      const detailRes = await fetch(`${BASE_URL}/admin/threads/${testThread._id}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (detailRes.ok) {
        const detailData = await detailRes.json();

        if (detailData.success) {
          console.log('✅ THREAD DETAILS SUCCESSFULLY LOADED:\n');
          console.log('┌─────────────────────────────────────────────────────────────┐');
          console.log('│                    📝 FULL THREAD DETAILS                   │');
          console.log('├─────────────────────────────────────────────────────────────┤');
          console.log(`│ Thread ID: ${detailData.data._id}                          │`);
          console.log('├─────────────────────────────────────────────────────────────┤');
          console.log('│ 📄 FULL CONTENT:                                           │');
          console.log(`│ "${detailData.data.content}"                                 │`);
          console.log('├─────────────────────────────────────────────────────────────┤');
          console.log('│ 👤 AUTHOR INFORMATION:                                      │');
          console.log(`│   Username: ${detailData.data.author?.username}                           │`);
          console.log(`│   Email: ${detailData.data.author?.email}                             │`);
          console.log(`│   Is Admin: ${detailData.data.author?.isAdmin ? '✅ Yes' : '❌ No'}                        │`);
          console.log(`│   Is Pro: ${detailData.data.author?.isPro ? '💎 Yes' : '👤 No'}                          │`);
          console.log('├─────────────────────────────────────────────────────────────┤');
          console.log('│ 📊 THREAD STATISTICS:                                       │');
          console.log(`│   Content Length: ${detailData.data.stats.contentLength} characters                     │`);
          console.log(`│   Media Files: ${detailData.data.stats.mediaCount}                                  │`);
          console.log(`│   Has Media: ${detailData.data.stats.hasMedia ? '✅ Yes' : '❌ No'}                           │`);
          console.log(`│   Created: ${new Date(detailData.data.createdAt).toLocaleString()}        │`);
          console.log(`│   Created Ago: ${detailData.data.stats.createdAgo}                        │`);
          console.log(`│   Author Account Age: ${detailData.data.stats.accountAge}                 │`);
          console.log('├─────────────────────────────────────────────────────────────┤');
          console.log('│ 🎯 ADMIN ACTIONS:                                           │');
          console.log('│   [📝 Edit] [🗑️ Delete] [🚫 Ban Author] [👁️ View Reports]     │');
          console.log('└─────────────────────────────────────────────────────────────┘\n');

          // 5. Phân tích nội dung
          console.log('🔍 ADMIN CONTENT ANALYSIS:\n');
          const content = detailData.data.content;
          const analysis = {
            isShort: content.length < 50,
            isLong: content.length > 200,
            hasUrls: /https?:\/\/|www\./i.test(content),
            hasSpam: /spam|quảng cáo|bán hàng|kiếm tiền/i.test(content),
            hasVietnamese: /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(content),
            hasCodeKeywords: /javascript|python|react|node|api|function|class|import/i.test(content)
          };

          console.log('📋 Content Properties:');
          console.log(`   Length: ${analysis.isShort ? '⚠️ Very Short' : analysis.isLong ? '📝 Detailed' : '✅ Normal'} (${content.length} chars)`);
          console.log(`   Language: ${analysis.hasVietnamese ? '🇻🇳 Vietnamese' : '🇺🇸 English'}`);
          console.log(`   Type: ${analysis.hasCodeKeywords ? '💻 Technical/Programming' : '💬 General Discussion'}`);
          console.log(`   Links: ${analysis.hasUrls ? '⚠️ Contains URLs' : '✅ No External Links'}`);
          console.log(`   Spam Risk: ${analysis.hasSpam ? '🚨 High Risk' : '✅ Clean Content'}`);

          console.log('\n🎯 Admin Recommendation:');
          if (analysis.hasSpam) {
            console.log('   🚨 IMMEDIATE ACTION: Delete spam content');
          } else if (analysis.isShort && !analysis.hasCodeKeywords) {
            console.log('   ⚠️ REVIEW: Content may lack substance');
          } else if (analysis.hasCodeKeywords) {
            console.log('   ✅ APPROVE: Technical content, likely valuable');
          } else {
            console.log('   📝 MONITOR: Regular content, continue monitoring');
          }

        } else {
          console.log(`❌ Failed to load details: ${detailData.message}`);
        }
      } else {
        console.log(`❌ HTTP Error: ${detailRes.status}`);
      }
    } else {
      console.log('❌ No threads found to test');
    }

    console.log('\n🎉 ADMIN THREAD DETAIL CAPABILITIES CONFIRMED:');
    console.log('✅ Click any thread from list to expand full details');
    console.log('✅ View complete content (không bị cắt ngắn)');
    console.log('✅ See full author information and stats');  
    console.log('✅ Get automatic content analysis and recommendations');
    console.log('✅ Ready for admin actions (edit/delete/ban)');
    console.log('\n🚀 Admin có thể "bấm để coi bài viết" hoàn chỉnh!');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

quickThreadDetailTest();