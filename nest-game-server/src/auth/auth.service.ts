import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import * as jwt from "jsonwebtoken";

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(username: string, password: string): Promise<User> {
    const existingUser = await this.userModel.findOne({ username });
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new this.userModel({ username, password: hashedPassword });
    return newUser.save();
  }

  async login(username: string, password: string): Promise<{ token: string }> {
    const user = await this.userModel.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { sub: user._id, username: user.username };
    const token = await this.jwtService.signAsync(payload);
    return { token };
  }

  async updateEmail(token: string, email: string) {
    const decoded = jwt.verify(token, 'SECRET_KEY') as { sub: string };
    const userId = decoded.sub;

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const exists = await this.userModel.findOne({ email });
    if (exists && exists._id as any !== userId) throw new ConflictException('Email already used');

    user.email = email;
    return user.save();
  }

  async updateUsername(token: string, username: string) {
    const decoded = jwt.verify(token, 'SECRET_KEY') as { sub: string };
    const userId = decoded.sub;

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const exists = await this.userModel.findOne({ username });
    if (exists && exists._id as any !== userId) throw new ConflictException('Username already exists');

    user.username = username;
    return user.save();
  }
}
