"""Read-only compatibility for checksum-bound lessons using the earlier HSK order.

Never write this view to vocabulary storage. Canonical lesson packages retain
their exact recorded serials; current runtime records retain official new IDs.
"""
import copy


def legacy_syllabus_view(data):
    result = copy.deepcopy(data)
    for entry in result['entries']:
        revision = entry.get('studyMetadata', {}).get('numberingRevision')
        if not revision:
            continue
        if revision['name'] != 'official-site-1219' or not isinstance(revision['previousId'], int):
            raise ValueError('Unsupported HSK numbering revision for the legacy lesson source')
        entry['hsk_index'] = revision['previousId']
        if entry.get('hskSource'):
            entry['hskSource']['sourceId'] = str(revision['previousId'])
    return result
