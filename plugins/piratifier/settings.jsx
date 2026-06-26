import { React, ReactNative } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { Forms } from "@vendetta/ui/components";

const { FormSwitchRow } = Forms;

export default function Settings() {
	useProxy(storage);
	return (
		<ReactNative.ScrollView style={{ flex: 1 }}>
			<FormSwitchRow
				label="Use AI Translation"
				subLabel="Translates messages online. Shows loading status notification."
				value={storage.settings.use_ai}
				onValueChange={(val) => {
					storage.settings.use_ai = val;
				}}
			/>
		</ReactNative.ScrollView>
	);
}

