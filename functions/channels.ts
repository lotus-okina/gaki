import type { Category, Channel, ChannelsResponse } from "../types.d.ts";

interface Env {
	CHANNELS_ACCESS_TOKEN: string;
	DISCORD_API_TOKEN: string;
	GUILD_ID: string;
}

class DiscordChannel {
	id: string;
	name: string;
	type: number;
	parent_id: string;
}

class DiscordActiveThreads {
	threads: DiscordChannel[];
}

enum ChannelType {
	GUILD_TEXT = 0,
	GUILD_CATEGORY = 4,
	GUILD_ANNOUNCEMENT = 5,
	ANNOUNCEMENT_THREAD = 10,
	PUBLIC_THREAD = 11,
	PRIVATE_THREAD = 12,
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
	const env = context.env;
	if (
		env.DISCORD_API_TOKEN == null ||
		env.CHANNELS_ACCESS_TOKEN == null ||
		env.GUILD_ID == null
	) {
		return new Response(
			JSON.stringify({
				success: false,
				message: "サーバ設定エラー",
			}),
			{ status: 500, statusText: "Internal Server Error" },
		);
	}

	// アクセストークン確認
	const accessTokenExpected = context.env.CHANNELS_ACCESS_TOKEN;
	const accessTokenActual = context.request.headers.get("Authorization");
	if (accessTokenExpected !== accessTokenActual) {
		return new Response(null, { status: 401, statusText: "Unauthorized" });
	}

	// Discordからチャンネル一覧を取得
	const guildId = context.env.GUILD_ID;
	const res = await fetch(
		`https://discord.com/api/v10/guilds/${guildId}/channels`,
		{
			method: "GET",
			headers: {
				Authorization: `Bot ${context.env.DISCORD_API_TOKEN}`,
			},
		},
	);

	if (!res.ok) {
		console.error(
			"チャンネル一覧取得失敗",
			`${res.status} ${res.statusText}`,
			await res.text(),
		);
		return new Response(
			JSON.stringify({
				success: false,
				message: "チャンネル一覧の取得に失敗しました",
			}),
			{ status: 500, statusText: "Internal Server Error" },
		);
	}

	const discordChannels: DiscordChannel[] = await res.json();

	const categories: { [key: string]: Category } = {};
	const channelMap: {
		[key: string]: Pick<DiscordChannel, "name" | "parent_id">;
	} = {};
	for (const obj of discordChannels) {
		if (obj.type === ChannelType.GUILD_CATEGORY) {
			categories[obj.id] = { name: obj.name, channels: [] };
		} else {
			channelMap[obj.id] = { name: obj.name, parent_id: obj.parent_id };
		}
	}

	const res2 = await fetch(
		`https://discord.com/api/v10/guilds/${guildId}/threads/active`,
		{
			method: "GET",
			headers: {
				Authorization: `Bot ${context.env.DISCORD_API_TOKEN}`,
			},
		},
	);

	if (!res2.ok) {
		console.error(
			"スレッド一覧取得失敗",
			`${res2.status} ${res2.statusText}`,
			await res2.text(),
		);
		return new Response(
			JSON.stringify({
				success: false,
				message: "スレッド一覧の取得に失敗しました",
			}),
			{ status: 500, statusText: "Internal Server Error" },
		);
	}

	const activeThreads: DiscordActiveThreads = await res2.json();

	// テキストチャンネルおよびその亜種のみ許可
	const allowedTypes = [
		ChannelType.GUILD_TEXT,
		ChannelType.GUILD_ANNOUNCEMENT,
		ChannelType.ANNOUNCEMENT_THREAD,
		ChannelType.PUBLIC_THREAD,
		ChannelType.PRIVATE_THREAD,
	];

	// チャンネル・スレッドをカテゴリに振り分け
	const uncategorized: Category = { name: null, channels: [] };
	for (const channel of discordChannels) {
		if (allowedTypes.includes(channel.type)) {
			const categoryId = channel.parent_id;
			const channelObj: Channel = {
				id: channel.id,
				name: channel.name,
				thread: false,
			};
			if (categoryId == null) {
				uncategorized.channels.push(channelObj);
			} else if (categoryId in categories) {
				categories[categoryId].channels.push(channelObj);
			} else {
				console.warn(
					"未取得のカテゴリに属するチャンネルを無視します",
					channel,
				);
			}
		}
	}
	for (const thread of activeThreads.threads) {
		if (allowedTypes.includes(thread.type)) {
			if (thread.parent_id in channelMap) {
				const parentChannel = channelMap[thread.parent_id];
				const threadObj: Channel = {
					id: thread.id,
					name: `${parentChannel.name} / ${thread.name}`,
					thread: true,
				};
				if (parentChannel.parent_id == null) {
					uncategorized.channels.push(threadObj);
				} else if (parentChannel.parent_id in categories) {
					categories[parentChannel.parent_id].channels.push(
						threadObj,
					);
				} else {
					console.warn(
						"未取得のカテゴリに属するチャンネルを無視します",
						thread,
					);
				}
			} else {
				// 親チャンネルがない場合は無視
				console.warn(
					"親チャンネルの存在しないスレッドを無視します",
					thread,
				);
			}
		}
	}
	// TODO: スレッドは親チャンネルとまとめて並べる
	// 現状は親チャンネルに関わらずカテゴリ内の最後にまとめて追加される

	// カテゴリ辞書をリストに変換
	const categoryList: Category[] = [];
	if (uncategorized.channels.length > 0) {
		categoryList.push(uncategorized);
	}
	categoryList.push(
		...Object.values(categories).filter((c) => c.channels.length > 0),
	);

	const responseBody: ChannelsResponse = { categories: categoryList };

	return new Response(JSON.stringify(responseBody));
};
