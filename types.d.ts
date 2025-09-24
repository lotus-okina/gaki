export class ChannelsResponse {
	categories: Category[];
}

export class Category {
	name: string | null;
	channels: Channel[];
}

export class Channel {
	id: string;
	name: string;
	thread: boolean;
}

export class PostRequest {
	channelId: string;
	message: string;
	password: string;
}
