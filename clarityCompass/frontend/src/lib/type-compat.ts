import type { Decision as ApiDecision, UserDetails as ApiUserDetails } from './api';
import type { Decision as TypesDecision, User as TypesUser } from './types';

export function isApiUserDetails(user: any): user is ApiUserDetails {
  return user && 
         typeof user.id === 'number' &&
         typeof user.full_name === 'string' &&
         typeof user.first_name === 'string' &&
         typeof user.last_name === 'string';
}

export function isApiDecision(decision: any): decision is ApiDecision {
  return decision && 
         typeof decision.id === 'number' &&
         typeof decision.owner === 'number' || decision.owner === null;
}

export function toApiDecision(decision: TypesDecision): ApiDecision {
  return decision as unknown as ApiDecision;
}

export function toApiUser(user: TypesUser): ApiUserDetails {
  return user as unknown as ApiUserDetails;
}

export function fromApiDecision(decision: ApiDecision): TypesDecision {
  return decision as unknown as TypesDecision;
}

export function fromApiUser(user: ApiUserDetails): TypesUser {
  return user as unknown as TypesUser;
}