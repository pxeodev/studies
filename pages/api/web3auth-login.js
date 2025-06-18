import { pick } from 'lodash';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

const onSuccess = (res, user) => {
  const relevantUserData = pick(user, [
    'id',
    'walletAddress',
    'web3authId',
    'provider',
    'email',
    'name',
    'profileImage',
    'authMethod'
  ]);
  
  let twentyYearsFromNow = new Date();
  twentyYearsFromNow.setFullYear(twentyYearsFromNow.getFullYear() + 20);
  twentyYearsFromNow = twentyYearsFromNow.toUTCString();
  
  res.setHeader('Set-Cookie', `user=${JSON.stringify(relevantUserData)};Expires=${twentyYearsFromNow};Secure;SameSite=Strict;Path=/;`);
  res.status(200).json({ success: true, user: relevantUserData });
};

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      walletAddress,
      verifierId: web3auth_id,
      typeOfLogin: provider,
      email,
      name,
      profileImage: profile_image
    } = req.body;

    console.log('Web3Auth login request:', {
      walletAddress,
      web3auth_id,
      provider,
      email,
      name,
      hasProfileImage: !!profile_image
    });

    if (!walletAddress) {
      console.error('Missing required fields:', { walletAddress: !!walletAddress });
      return res.status(400).json({ error: 'Missing wallet address' });
    }

    // Check if user exists by wallet address or web3auth_id (if available)
    let existingUser;
    if (web3auth_id) {
      existingUser = (await sql`
        SELECT * FROM "User"
        WHERE "walletAddress" = ${walletAddress}
        OR "web3authId" = ${web3auth_id}
      `)[0];
    } else {
      existingUser = (await sql`
        SELECT * FROM "User"
        WHERE "walletAddress" = ${walletAddress}
      `)[0];
    }

    if (existingUser) {
      console.log('Found existing user:', {
        id: existingUser.id,
        walletAddress: existingUser.walletAddress,
        authMethod: existingUser.authMethod,
        existing_web3authId: existingUser.web3authId
      });

      // Update existing user with Web3Auth data if it's a legacy user
      if (existingUser.authMethod === 'legacy' || !existingUser.web3authId) {
        console.log('Upgrading legacy user to Web3Auth...');
        
        const updatedUser = (await sql`
          UPDATE "User"
          SET
            "web3authId" = ${web3auth_id},
            "provider" = ${provider},
            "email" = ${email || existingUser.email},
            "name" = ${name || existingUser.name},
            "profileImage" = ${profile_image || existingUser.profileImage},
            "authMethod" = 'web3auth',
            "updatedAt" = NOW()
          WHERE "id" = ${existingUser.id}
          RETURNING *
        `)[0];
        
        console.log('User upgraded successfully:', {
          id: updatedUser.id,
          walletAddress: updatedUser.walletAddress,
          provider: updatedUser.provider,
          authMethod: updatedUser.authMethod
        });
        
        onSuccess(res, updatedUser);
      } else {
        console.log('Existing Web3Auth user, updating last login...');
        
        // User already exists with Web3Auth, just update last login
        const updatedUser = (await sql`
          UPDATE "User"
          SET "updatedAt" = NOW()
          WHERE "id" = ${existingUser.id}
          RETURNING *
        `)[0];
        
        console.log('Login time updated for user:', {
          id: updatedUser.id,
          walletAddress: updatedUser.walletAddress
        });
        
        onSuccess(res, updatedUser);
      }
    } else {
      console.log('Creating new user...');
      
      // Create new user
      const newUser = (await sql`
        INSERT INTO "User" (
          "walletAddress",
          "web3authId",
          "provider",
          "email",
          "name",
          "profileImage",
          "authMethod",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${walletAddress},
          ${web3auth_id || null},
          ${provider || null},
          ${email || null},
          ${name || null},
          ${profile_image || null},
          ${web3auth_id ? 'web3auth' : 'wallet'},
          NOW(),
          NOW()
        )
        RETURNING *
      `)[0];
      
      console.log('New user created successfully:', {
        id: newUser.id,
        walletAddress: newUser.walletAddress,
        provider: newUser.provider,
        email: newUser.email,
        name: newUser.name,
        auth_method: newUser.auth_method
      });
      
      onSuccess(res, newUser);
    }
  } catch (error) {
    console.error('Web3Auth login error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    });
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      code: error.code
    });
  }
};

export default handler;