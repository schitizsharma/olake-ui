import { Checkbox, Empty } from "antd"
import { useEffect, useState } from "react"
import StreamPanel from "./StreamPanel"
import { GroupedStreamsCollapsibleListProps } from "../../../../types"
import { CaretDown, CaretRight } from "@phosphor-icons/react"

const StreamsCollapsibleList = ({
	groupedStreams,
	selectedStreams,
	setActiveStreamData,
	activeStreamData,
	onStreamSelect,
	setSelectedStreams,
}: GroupedStreamsCollapsibleListProps) => {
	const [openNamespaces, setOpenNamespaces] = useState<{
		[ns: string]: boolean
	}>({})
	const [checkedStatus, setCheckedStatus] = useState<{
		global: boolean
		namespaces: { [ns: string]: boolean }
		streams: { [ns: string]: { [streamName: string]: boolean } }
	}>({
		global: false,
		namespaces: {},
		streams: {},
	})

	useEffect(() => {
		if (Object.keys(openNamespaces).length === 0) {
			const allOpen: { [ns: string]: boolean } = {}
			Object.keys(groupedStreams).forEach((ns: string) => {
				allOpen[ns] = true
			})
			setOpenNamespaces(allOpen)
		} else {
			setOpenNamespaces(prev => {
				const updated = { ...prev }
				Object.keys(groupedStreams).forEach((ns: string) => {
					if (updated[ns] === undefined) {
						updated[ns] = true
					}
				})
				return updated
			})
		}
	}, [groupedStreams])

	// Update local checked status based on selectedStreams
	useEffect(() => {
		const newCheckedStatus = {
			global: false,
			namespaces: {} as { [ns: string]: boolean },
			streams: {} as { [ns: string]: { [streamName: string]: boolean } },
		}

		// Initialize streams checked status
		Object.entries(groupedStreams).forEach(([ns, streams]) => {
			newCheckedStatus.streams[ns] = {}

			// For each stream, check if it is selected
			streams.forEach(stream => {
				const streamName = stream.stream.name
				let isStreamSelected = false

				if ("selected_streams" in selectedStreams) {
					// CombinedStreamsData format
					isStreamSelected = !!(selectedStreams as any).selected_streams[
						ns
					]?.some(
						(selected: { stream_name: string }) =>
							selected.stream_name === streamName,
					)
				} else {
					// Regular mapping format
					isStreamSelected = !!(selectedStreams as any)[ns]?.some(
						(selected: { stream_name: string }) =>
							selected.stream_name === streamName,
					)
				}

				newCheckedStatus.streams[ns][streamName] = isStreamSelected
			})

			// Check if all streams in this namespace are selected
			const allStreamsInNamespaceSelected = streams.every(
				stream => newCheckedStatus.streams[ns][stream.stream.name],
			)
			newCheckedStatus.namespaces[ns] = allStreamsInNamespaceSelected
		})

		// Check if all namespaces are selected
		const allNamespacesSelected = Object.values(
			newCheckedStatus.namespaces,
		).every(value => value)
		newCheckedStatus.global = allNamespacesSelected

		setCheckedStatus(newCheckedStatus)
	}, [selectedStreams, groupedStreams])

	const handleToggleNamespace = (ns: string) => {
		setOpenNamespaces(prev => ({ ...prev, [ns]: !prev[ns] }))
	}

	const handleNamespaceSyncAll = (ns: string, checked: boolean) => {
		// Force a state update by manipulating the localStorage first
		try {
			// Store the namespace we're trying to modify in localStorage
			localStorage.setItem("__lastToggledNamespace", ns)
			localStorage.setItem("__lastToggledNamespaceState", String(checked))
		} catch {
			// Ignore any localStorage errors
		}

		// Update local checked status
		setCheckedStatus(prev => ({
			...prev,
			namespaces: { ...prev.namespaces, [ns]: checked },
			streams: {
				...prev.streams,
				[ns]: Object.keys(prev.streams[ns] || {}).reduce(
					(acc, streamName) => {
						acc[streamName] = checked
						return acc
					},
					{} as { [streamName: string]: boolean },
				),
			},
		}))

		if (!checked) {
			// For unchecking, call the original onStreamSelect for each stream in this namespace
			const streamsInNamespace = groupedStreams[ns] || []

			streamsInNamespace.forEach(streamData => {
				onStreamSelect(streamData.stream.name, false, ns)
			})

			// Then manually call setSelectedStreams as a fallback approach
			setTimeout(() => {
				if (
					typeof selectedStreams === "object" &&
					selectedStreams !== null &&
					"selected_streams" in selectedStreams &&
					selectedStreams.selected_streams // Ensure selected_streams itself is not null/undefined
				) {
					// selectedStreams is of type { selected_streams: { [key: string]: StreamDetail[] }, streams: StreamData[] }
					const updatedState = {
						...selectedStreams,
						selected_streams: {
							...selectedStreams.selected_streams,
							[ns]: [],
						},
					}
					setSelectedStreams(updatedState)
				}
			}, 100)
		} else {
			const streamsInNamespace = groupedStreams[ns] || []

			streamsInNamespace.forEach(streamData => {
				onStreamSelect(streamData.stream.name, true, ns)
			})

			setTimeout(() => {
				const streamNames = streamsInNamespace.map(s => s.stream.name)
				const newStreamEntries = streamNames.map(stream_name => ({
					stream_name,
					partition_regex: "",
					normalization: false,
				}))

				if (selectedStreams) {
					if (
						typeof selectedStreams === "object" &&
						selectedStreams !== null &&
						"selected_streams" in selectedStreams &&
						selectedStreams.selected_streams
					) {
						// selectedStreams is of type { selected_streams: { [key: string]: StreamDetail[] }, streams: StreamData[] }
						const updatedState = {
							...selectedStreams,
							selected_streams: {
								...selectedStreams.selected_streams,
								[ns]: newStreamEntries,
							},
						}
						setSelectedStreams(updatedState)
					} else if (
						typeof selectedStreams === "object" &&
						selectedStreams !== null &&
						!Array.isArray(selectedStreams) &&
						!("selected_streams" in selectedStreams)
					) {
						// selectedStreams is of type { [key: string]: StreamDetail[] }
						const updatedState = {
							...(selectedStreams as { [key: string]: any }), // Cast to allow spread for generic object map
							[ns]: newStreamEntries,
						}
						setSelectedStreams(updatedState)
					}
				}
			}, 100)
		}
	}

	const handleGlobalSyncAll = (checked: boolean) => {
		try {
			localStorage.setItem("__globalSync", String(checked))
		} catch {}

		setCheckedStatus(prev => {
			const updatedNamespaces = { ...prev.namespaces }
			const updatedStreams = { ...prev.streams }

			Object.keys(groupedStreams).forEach(ns => {
				updatedNamespaces[ns] = checked
				updatedStreams[ns] = groupedStreams[ns].reduce(
					(acc, stream) => {
						acc[stream.stream.name] = checked
						return acc
					},
					{} as { [streamName: string]: boolean },
				)
			})

			return {
				global: checked,
				namespaces: updatedNamespaces,
				streams: updatedStreams,
			}
		})

		if (!checked) {
			Object.keys(groupedStreams).forEach(ns => {
				handleNamespaceSyncAll(ns, false)
			})
		} else {
			Object.entries(groupedStreams).forEach(([ns, streams]) => {
				streams.forEach(streamData => {
					onStreamSelect(streamData.stream.name, true, ns)
				})
			})
		}
	}

	const handleStreamSelect = (
		streamName: string,
		checked: boolean,
		ns: string,
	) => {
		setCheckedStatus(prev => {
			const updatedStreams = {
				...prev.streams,
				[ns]: {
					...prev.streams[ns],
					[streamName]: checked,
				},
			}

			const allStreamsInNamespaceSelected = groupedStreams[ns].every(
				stream => updatedStreams[ns][stream.stream.name],
			)

			const updatedNamespaces = {
				...prev.namespaces,
				[ns]: allStreamsInNamespaceSelected,
			}

			const allNamespacesSelected = Object.keys(groupedStreams).every(
				namespace => updatedNamespaces[namespace],
			)

			return {
				global: allNamespacesSelected,
				namespaces: updatedNamespaces,
				streams: updatedStreams,
			}
		})

		onStreamSelect(streamName, checked, ns)
	}

	return (
		<div className="flex h-full flex-col">
			{Object.keys(groupedStreams).length === 0 ? (
				<Empty className="pt-10" />
			) : (
				<>
					<div className="mb-4 flex items-center">
						<Checkbox
							checked={checkedStatus.global}
							onChange={e => handleGlobalSyncAll(e.target.checked)}
						>
							Sync all
						</Checkbox>
					</div>
					{Object.entries(groupedStreams).map(([ns, streams]) => {
						return (
							<div
								key={ns}
								className="mb-2 border border-solid border-[#e5e7eb]"
							>
								<div
									className="flex cursor-pointer items-center border-b border-solid border-[#e5e7eb] bg-[#f5f5f5] p-3"
									onClick={() => handleToggleNamespace(ns)}
								>
									<Checkbox
										checked={checkedStatus.namespaces[ns]}
										onChange={e => handleNamespaceSyncAll(ns, e.target.checked)}
										onClick={e => e.stopPropagation()}
										className="mr-2"
									/>
									<span className="font-semibold">{ns}</span>
									<span className="ml-auto">
										{openNamespaces[ns] ? (
											<CaretDown
												className="size-4"
												weight="fill"
											/>
										) : (
											<CaretRight
												className="size-4"
												weight="fill"
											/>
										)}
									</span>
								</div>
								{openNamespaces[ns] && (
									<div className="w-full">
										{streams.map(streamData => (
											<StreamPanel
												stream={streamData}
												key={streamData?.stream?.name}
												activeStreamData={activeStreamData}
												setActiveStreamData={setActiveStreamData}
												onStreamSelect={(streamName, checked) =>
													handleStreamSelect(streamName, checked, ns)
												}
												isSelected={
													checkedStatus.streams[ns]?.[streamData.stream.name] ||
													false
												}
											/>
										))}
									</div>
								)}
							</div>
						)
					})}
				</>
			)}
		</div>
	)
}

export default StreamsCollapsibleList
