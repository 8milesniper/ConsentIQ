import { insertConsentSessionSchema } from './shared/schema';

const testData = {
  recipientFullName: "Test",
  verifiedOver18: true
};

try {
  const result = insertConsentSessionSchema.parse(testData);
  console.log('✅ Schema validation passed:', JSON.stringify(result, null, 2));
} catch (error: any) {
  console.log('❌ Schema validation failed:', error.errors);
}
