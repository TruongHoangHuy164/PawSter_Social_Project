// Script tìm và tạo admin mới
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './models/user.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function findOrCreateAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Tìm tất cả admin
    const admins = await User.find({ isAdmin: true });
    console.log(`📋 Found ${admins.length} admin(s):`);
    
    admins.forEach((admin, index) => {
      console.log(`  ${index + 1}. ${admin.username} (${admin.email}) - ID: ${admin._id}`);
    });

    if (admins.length === 0) {
      console.log('\n🔧 Tạo admin mới...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const newAdmin = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        isAdmin: true,
        isPro: true
      });
      
      await newAdmin.save();
      console.log('✅ Admin mới đã được tạo:');
      console.log('   Email: admin@example.com');
      console.log('   Password: admin123');
    } else {
      console.log('\n🔧 Reset password cho admin đầu tiên...');
      const firstAdmin = admins[0];
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await User.findByIdAndUpdate(firstAdmin._id, { 
        password: hashedPassword,
        email: 'admin@example.com' // Đảm bảo email chuẩn
      });
      
      console.log('✅ Admin password đã được reset:');
      console.log(`   Email: admin@example.com`);
      console.log('   Password: admin123');
      console.log(`   Username: ${firstAdmin.username}`);
    }

    console.log('\n🎯 Bây giờ bạn có thể đăng nhập với:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📱 Disconnected from MongoDB');
  }
}

findOrCreateAdmin();