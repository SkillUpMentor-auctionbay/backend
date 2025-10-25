export interface UserWithProfilePicture {
  id: string;
  name: string;
  surname: string;
  profile_picture_url?: string;
}

export interface BaseBidderDto {
  id: string;
  name: string;
  surname: string;
  profilePictureUrl?: string;
}

export function mapUserToBidderDto(user: UserWithProfilePicture): BaseBidderDto {
  return {
    id: user.id,
    name: user.name,
    surname: user.surname,
    profilePictureUrl: user.profile_picture_url,
  };
}

export function createSellerName(user: { name: string; surname: string }): string {
  return `${user.name} ${user.surname}`;
}