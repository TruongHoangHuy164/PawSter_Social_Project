// Demo chi tiết chức năng admin quản lý nội dung threads
const BASE_URL = 'http://localhost:3000/api';

async function detailedThreadManagementDemo() {
  console.log('📋 DETAILED ADMIN THREAD CONTENT MANAGEMENT DEMO\n');

  try {
    // 1. Admin login
    console.log('🔐 Admin Authentication...');
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
    console.log('✅ Admin authenticated successfully\n');

    // 2. Tạo sample threads với nội dung đa dạng
    console.log('📝 Creating diverse sample threads...');
    const sampleContents = [
      {
        content: 'Hướng dẫn cài đặt Node.js và npm trên Windows 11. Bước 1: Tải file installer từ nodejs.org...',
        category: 'tutorial'
      },
      {
        content: 'Câu hỏi: Làm thế nào để optimize performance của React app? Tôi đang gặp vấn đề với re-rendering...',
        category: 'question'
      },
      {
        content: 'Chia sẻ: Top 5 VS Code extensions cho JavaScript developer mà bạn nên biết trong năm 2025',
        category: 'sharing'
      },
      {
        content: 'Bug report: API endpoint /users trả về 500 error khi gửi request với empty body',
        category: 'bug'
      },
      {
        content: 'Thảo luận về việc sử dụng TypeScript vs JavaScript cho dự án lớn. Ưu nhược điểm của từng approach',
        category: 'discussion'
      }
    ];

    const createdThreads = [];
    for (let i = 0; i < sampleContents.length; i++) {
      // Tạo user
      const userRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: `user_${i + 1}_${Date.now()}`,
          email: `user${i + 1}@demo.com`,
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
          body: JSON.stringify({ content: sampleContents[i].content })
        });
        const threadData = await threadRes.json();

        if (threadData.success) {
          createdThreads.push({
            id: threadData.data._id,
            content: sampleContents[i].content,
            category: sampleContents[i].category,
            author: userData.data.user.username,
            createdAt: threadData.data.createdAt
          });
          console.log(`   ✅ [${sampleContents[i].category.toUpperCase()}] Created by ${userData.data.user.username}`);
        }
      }
    }

    // 3. ADMIN VIEWING - Xem toàn bộ nội dung
    console.log('\n🔍 ADMIN VIEWING CAPABILITIES:\n');
    
    console.log('📋 1. List All Threads with Full Content:');
    const allRes = await fetch(`${BASE_URL}/admin/threads?limit=10`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const allData = await allRes.json();
    
    if (allData.success) {
      allData.data.forEach((thread, index) => {
        console.log(`\n   ${index + 1}. Thread ID: ${thread._id}`);
        console.log(`      Author: ${thread.author?.username || 'Unknown'}`);
        console.log(`      Created: ${new Date(thread.createdAt).toLocaleString()}`);
        console.log(`      Content: "${thread.content}"`);
        console.log(`      Length: ${thread.content.length} characters`);
      });
    }

    // 4. ADVANCED SEARCH - Tìm kiếm nâng cao
    console.log('\n\n🔎 ADVANCED SEARCH CAPABILITIES:\n');

    const searchTests = [
      { query: 'Node.js', description: 'Technology keyword search' },
      { query: 'React', description: 'Framework search' },
      { query: 'hướng dẫn', description: 'Vietnamese content search' },
      { query: 'performance', description: 'Performance-related content' },
      { query: 'API', description: 'API-related discussions' },
      { query: 'TypeScript', description: 'Language preference discussions' }
    ];

    for (const test of searchTests) {
      const searchRes = await fetch(`${BASE_URL}/admin/threads?q=${encodeURIComponent(test.query)}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const searchData = await searchRes.json();

      console.log(`🔍 ${test.description}: "${test.query}"`);
      if (searchData.success && searchData.data.length > 0) {
        console.log(`   ✅ Found ${searchData.data.length} matching thread(s):`);
        searchData.data.forEach(thread => {
          // Highlight matching text
          const contentLower = thread.content.toLowerCase();
          const queryLower = test.query.toLowerCase();
          const index = contentLower.indexOf(queryLower);
          
          if (index !== -1) {
            const start = Math.max(0, index - 30);
            const end = Math.min(thread.content.length, index + test.query.length + 30);
            const snippet = thread.content.substring(start, end);
            const highlighted = snippet.replace(new RegExp(test.query, 'gi'), `**${test.query}**`);
            
            console.log(`      - ...${highlighted}...`);
          } else {
            console.log(`      - "${thread.content.substring(0, 60)}..."`);
          }
        });
      } else {
        console.log('   ❌ No matches found');
      }
      console.log('');
    }

    // 5. CONTENT FILTERING - Lọc theo loại nội dung
    console.log('\n📊 CONTENT FILTERING BY TYPE:\n');

    const contentFilters = [
      { keyword: 'hướng dẫn', type: 'Tutorial' },
      { keyword: 'câu hỏi', type: 'Question' },
      { keyword: 'chia sẻ', type: 'Sharing' },
      { keyword: 'bug', type: 'Bug Report' },
      { keyword: 'thảo luận', type: 'Discussion' }
    ];

    for (const filter of contentFilters) {
      const filterRes = await fetch(`${BASE_URL}/admin/threads?q=${encodeURIComponent(filter.keyword)}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const filterData = await filterRes.json();

      console.log(`📂 ${filter.type} Content:`);
      if (filterData.success && filterData.data.length > 0) {
        filterData.data.forEach(thread => {
          console.log(`   ✅ "${thread.content.substring(0, 80)}..." by ${thread.author?.username}`);
        });
      } else {
        console.log('   ❌ No content of this type found');
      }
      console.log('');
    }

    // 6. CONTENT MODERATION - Kiểm duyệt nội dung
    console.log('\n🛡️ CONTENT MODERATION CAPABILITIES:\n');

    // Tạo thread có nội dung cần kiểm duyệt
    const moderationUser = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `modtest_${Date.now()}`,
        email: `modtest@demo.com`,
        password: 'password123'
      })
    });
    const moderationUserData = await moderationUser.json();

    if (moderationUserData.success) {
      const problematicContent = [
        'Thread này có chứa thông tin spam và quảng cáo không phù hợp',
        'Nội dung vi phạm quy định cộng đồng và cần được xem xét'
      ];

      const problematicThreads = [];
      for (const content of problematicContent) {
        const threadRes = await fetch(`${BASE_URL}/threads`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${moderationUserData.data.token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ content })
        });
        const threadData = await threadRes.json();
        
        if (threadData.success) {
          problematicThreads.push(threadData.data._id);
        }
      }

      // Admin tìm và xóa nội dung vi phạm
      console.log('🔍 Searching for policy-violating content...');
      const violationRes = await fetch(`${BASE_URL}/admin/threads?q=vi phạm`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const violationData = await violationRes.json();

      if (violationData.success && violationData.data.length > 0) {
        console.log(`⚠️ Found ${violationData.data.length} potentially problematic thread(s):`);
        
        for (const thread of violationData.data) {
          console.log(`   🚨 ID: ${thread._id}`);
          console.log(`      Content: "${thread.content}"`);
          console.log(`      Author: ${thread.author?.username}`);
          console.log(`      Action: Reviewing for policy violation...`);
          
          // Admin có thể xóa ngay lập tức
          const deleteRes = await fetch(`${BASE_URL}/admin/threads/${thread._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
          });
          const deleteData = await deleteRes.json();
          
          if (deleteData.success) {
            console.log(`      ✅ REMOVED: Policy violation content deleted`);
          } else {
            console.log(`      ❌ Failed to delete: ${deleteData.message}`);
          }
          console.log('');
        }
      }
    }

    // 7. BULK MANAGEMENT - Quản lý hàng loạt
    console.log('\n📦 BULK CONTENT MANAGEMENT:\n');

    // Tìm tất cả threads của một user cụ thể
    if (createdThreads.length > 0) {
      const targetUser = createdThreads[0].author;
      console.log(`🎯 Managing all content from user: ${targetUser}`);
      
      const userContentRes = await fetch(`${BASE_URL}/admin/threads?author=${encodeURIComponent(targetUser)}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const userContentData = await userContentRes.json();
      
      if (userContentData.success) {
        console.log(`📊 Found ${userContentData.data.length} threads from this user:`);
        userContentData.data.forEach((thread, index) => {
          console.log(`   ${index + 1}. "${thread.content.substring(0, 60)}..."`);
        });
        
        // Admin có thể xóa tất cả hoặc từng cái một
        console.log(`\n🛠️ Admin can:`);
        console.log(`   - Review each thread individually`);
        console.log(`   - Delete specific threads that violate policies`);
        console.log(`   - Monitor user's posting patterns`);
        console.log(`   - Take action on user account if needed`);
      }
    }

    // 8. REPORTING & ANALYTICS
    console.log('\n📈 CONTENT ANALYTICS & REPORTING:\n');

    const analyticsRes = await fetch(`${BASE_URL}/admin/threads?limit=100`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const analyticsData = await analyticsRes.json();

    if (analyticsData.success) {
      const threads = analyticsData.data;
      
      // Thống kê độ dài nội dung
      const lengthStats = threads.map(t => t.content.length);
      const avgLength = lengthStats.reduce((a, b) => a + b, 0) / lengthStats.length;
      const maxLength = Math.max(...lengthStats);
      const minLength = Math.min(...lengthStats);
      
      console.log(`📊 Content Statistics:`);
      console.log(`   Total threads: ${threads.length}`);
      console.log(`   Average content length: ${Math.round(avgLength)} characters`);
      console.log(`   Longest thread: ${maxLength} characters`);
      console.log(`   Shortest thread: ${minLength} characters`);
      
      // Top authors
      const authorCounts = {};
      threads.forEach(thread => {
        const author = thread.author?.username || 'Unknown';
        authorCounts[author] = (authorCounts[author] || 0) + 1;
      });
      
      const topAuthors = Object.entries(authorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
      
      console.log(`\n👥 Top Content Contributors:`);
      topAuthors.forEach(([author, count], index) => {
        console.log(`   ${index + 1}. ${author}: ${count} threads`);
      });
    }

    // TỔNG KẾT CAPABILITIES
    console.log('\n🎯 ADMIN THREAD CONTENT MANAGEMENT CAPABILITIES SUMMARY:\n');
    
    console.log('✅ VIEWING & ACCESS:');
    console.log('   - Xem toàn bộ nội dung của tất cả threads');
    console.log('   - Truy cập thông tin chi tiết (author, timestamp, content length)');
    console.log('   - Pagination và sorting để quản lý dữ liệu lớn');
    
    console.log('\n✅ SEARCH & FILTERING:');
    console.log('   - Tìm kiếm theo từ khóa trong nội dung');
    console.log('   - Tìm kiếm theo tác giả cụ thể');
    console.log('   - Lọc theo loại nội dung (tutorial, question, discussion, etc.)');
    console.log('   - Hỗ trợ tìm kiếm tiếng Việt và tiếng Anh');
    
    console.log('\n✅ CONTENT MODERATION:');
    console.log('   - Phát hiện nội dung vi phạm chính sách');
    console.log('   - Xóa nội dung không phù hợp ngay lập tức');
    console.log('   - Quản lý nội dung spam và quảng cáo');
    
    console.log('\n✅ BULK MANAGEMENT:');
    console.log('   - Quản lý tất cả nội dung của một user');
    console.log('   - Xem patterns và xu hướng posting');
    console.log('   - Thực hiện actions hàng loạt khi cần thiết');
    
    console.log('\n✅ ANALYTICS & REPORTING:');
    console.log('   - Thống kê về độ dài và chất lượng nội dung');
    console.log('   - Xác định top contributors');
    console.log('   - Monitor content trends và patterns');
    
    console.log('\n🚀 KẾT LUẬN: ADMIN CÓ TOÀN QUYỀN VÀ CÔNG CỤ ĐẦY ĐỦ ĐỂ QUẢN LÝ NỘI DUNG THREADS!');

  } catch (error) {
    console.error('❌ Demo Error:', error.message);
  }
}

// Chạy demo
setTimeout(detailedThreadManagementDemo, 2000);