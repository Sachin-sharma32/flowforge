import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserDocument extends Document {
  email: string;
  passwordHash?: string;
  name: string;
  avatar?: string;
  isVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: Date;
  oauthProviders?: {
    google?: {
      id?: string;
      email?: string;
    };
    github?: {
      id?: string;
      username?: string;
      email?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: false },
    name: { type: String, required: true, trim: true },
    avatar: { type: String },
    isVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String },
    emailVerificationExpiresAt: { type: Date },
    oauthProviders: {
      google: {
        id: { type: String },
        email: { type: String },
      },
      github: {
        id: { type: String },
        username: { type: String },
        email: { type: String },
      },
    },
  },
  { timestamps: true },
);

userSchema.index({ 'oauthProviders.google.id': 1 }, { unique: true, sparse: true });
userSchema.index({ 'oauthProviders.github.id': 1 }, { unique: true, sparse: true });

userSchema.pre('save', async function (next) {
  if (!this.passwordHash || !this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.set('toJSON', {
  transform(_doc, ret: Record<string, any>) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.emailVerificationTokenHash;
    delete ret.emailVerificationExpiresAt;
    delete ret.oauthProviders;
  },
});

export const User = mongoose.model<IUserDocument>('User', userSchema);
