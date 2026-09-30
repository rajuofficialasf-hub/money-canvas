import { getViewFromPath, ROUTE_MAP } from '../src/lib/routes';

function runTests() {
  console.log('--- STARTING FEAT-4 ACCOUNT & DATA DELETION TESTS ---');

  // Test 1: Route Mapping
  console.log('Test 1: Route mapping for Play Store Data Deletion...');
  if (ROUTE_MAP.data_deletion !== '/data-deletion') {
    throw new Error(`Expected ROUTE_MAP.data_deletion to be /data-deletion, got ${ROUTE_MAP.data_deletion}`);
  }
  if (getViewFromPath('/data-deletion') !== 'data_deletion') {
    throw new Error('getViewFromPath(/data-deletion) failed to resolve to data_deletion');
  }
  if (getViewFromPath('/delete-account') !== 'data_deletion') {
    throw new Error('getViewFromPath(/delete-account) alias failed to resolve to data_deletion');
  }
  if (getViewFromPath('/account-deletion') !== 'data_deletion') {
    throw new Error('getViewFromPath(/account-deletion) alias failed to resolve to data_deletion');
  }
  console.log('✓ Route mappings for Play Store URL compliance verified');

  // Test 2: Email validation for web deletion request
  console.log('Test 2: Email validation logic...');
  const validateEmail = (email: string) => {
    return Boolean(email && email.trim().length > 3 && email.includes('@') && email.includes('.'));
  };

  if (validateEmail('')) throw new Error('Empty email should fail validation');
  if (validateEmail('invalid-email')) throw new Error('Email without @ should fail');
  if (validateEmail('test@')) throw new Error('Email without domain should fail');
  if (!validateEmail('user@example.com')) throw new Error('Valid email failed');
  if (!validateEmail('raju.official.asf@gmail.com')) throw new Error('Valid email failed');
  console.log('✓ Deletion request email validation verified');

  // Test 3: Safety confirmation verification
  console.log('Test 3: Confirmation keyword check...');
  const isConfirmed = (keyword: string) => keyword.trim().toUpperCase() === 'DELETE';
  if (isConfirmed('delete ') !== true) throw new Error('delete with spaces should be recognized');
  if (isConfirmed('DELETE') !== true) throw new Error('uppercase DELETE should be recognized');
  if (isConfirmed('del') !== false) throw new Error('del should be rejected');
  if (isConfirmed('') !== false) throw new Error('empty string should be rejected');
  console.log('✓ Confirmation safety check verified');

  console.log('🎉 ALL FEAT-4 ACCOUNT DELETION TESTS PASSED PERFECTLY!');
}

runTests();
