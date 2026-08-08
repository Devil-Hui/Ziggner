# -*- coding: utf-8 -*-
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def patch(path, edits):
    s = open(path, encoding='utf-8').read()
    for anchor, insert in edits:
        if anchor not in s:
            print('!! ANCHOR MISS in %s: %r' % (path, anchor[:60]))
            continue
        if s.count(anchor) != 1:
            print('!! ANCHOR NOT UNIQUE in %s: %r' % (path, anchor[:60]))
            continue
        s = s.replace(anchor, anchor + insert)
    open(path, 'w', encoding='utf-8').write(s)
    print('OK', path)

en_edits = [
    ("      enabled: 'Enabled',\n      disabled: 'Disabled',\n      createdAt: 'Created',",
     "\n      columnColor: 'Color',\n      colorLabel: 'Tag Color',"),
    ("      columnSubmittedAt: 'Submitted',",
     "\n      formAmountPlaceholderPercent: 'e.g. 15',\n      formAmountPlaceholderFixed: 'e.g. 20.00',"),
    ("      columnUsage: 'Usage',",
     "\n      usedCountFormat: 'Used {used}/{total}',"),
    ("      hideMembers: 'Hide Members',",
     "\n      roleLeader: 'Group Leader',\n      roleMember: 'Member',"),
    ("      empty: 'Your cart is empty',\n      startShopping: 'Start Shopping',",
     "\n      emptyDesc: 'Your cart is empty. Browse our products to get started',"),
    ("  store: {",
     "\n    chatDetail: {\n"
     "      filterAll: 'All',\n      filterText: 'Text',\n      filterImage: 'Image',\n      filterCard: 'Card',\n"
     "      conversationList: 'Conversations',\n      loading: 'Loading...',\n      noMessages: 'No messages',\n"
     "      support: 'Support',\n      markReplied: 'Mark Replied',\n      closeConversation: 'Close',\n"
     "      lockBanner: 'This conversation is being handled by {handler}',\n      otherAdmin: 'another admin',\n"
     "      conversationClosed: 'Conversation closed',\n      sendProductCard: 'Send product card',\n"
     "      inputPlaceholder: 'Type a reply...',\n      sending: 'Sending...',\n      uploading: 'Uploading...',\n"
     "      mediaLabel: 'Image/Video',\n      selectConversationHint: 'Select a conversation from the left',\n"
     "      selectProduct: 'Select Product',\n      searchProductPlaceholder: 'Search products...',\n"
     "      searching: 'Searching...',\n      noProductsFound: 'No products found',\n"
     "      searchHint: 'Enter keywords to search products',\n      sendCard: 'Send Card',\n"
     "      statusOpen: 'Open',\n      statusClosed: 'Closed',\n      today: 'Today',\n      yesterday: 'Yesterday',\n"
     "    },\n"
     "    mediaManager: {\n"
     "      title: 'Product Media',\n"
     "      mediaCount: '(images {imageCount}/{maxImages}, videos {videoCount}/{maxVideos})',\n"
     "      addImage: 'Add Image',\n      addVideo: 'Add Video',\n"
     "      dropzoneHint: 'Drag & drop images here, or click to select',\n"
     "      formatHint: 'Supports JPG / PNG / WebP, up to 10MB per image',\n"
     "      editModeHint: ' (edit mode: uploaded directly after cropping)',\n"
     "      createModeHint: ' (cropped & staged, submitted with the form)',\n"
     "      processingDone: 'Done',\n      processingFile: 'Processing: {name}',\n"
     "      emptyHint: 'No media yet. Drag & drop or click the area above to add',\n"
     "      imageLimitReached: 'Image limit reached',\n      uploadFailed: 'Upload failed',\n"
     "      confirmDeleteActive: 'This media is live. Confirm deletion?',\n      deleteFailed: 'Delete failed',\n"
     "      updateFailed: 'Update failed',\n"
     "      videoNotSupported: 'Videos are not supported in edit mode. Please upload via create mode',\n"
     "    },\n"
     "    imageCropper: {\n"
     "      title: 'Crop Image',\n      info: 'Drag to move · resize corners · aspect ratio {ratio}:1',\n"
     "      cancel: 'Cancel',\n      confirm: 'Confirm Crop',\n"
     "    },\n"
     "    notificationFloat: {\n"
     "      title: 'Notifications',\n      empty: 'No notifications',\n"
     "    },\n"),
    ("  store: {\n    nav: {",
     "  store: {\n"
     "    support: {\n"
     "      title: 'Support',\n      newButton: '+ New',\n      newConversationDefault: 'New conversation',\n"
     "      productInquiry: 'Product inquiry: {name}',\n      subjectPlaceholder: 'Subject (optional)',\n"
     "      contentPlaceholder: 'Describe your issue...',\n      uploading: 'Uploading...',\n"
     "      attachLabel: 'Image/Video',\n      cancel: 'Cancel',\n      sending: 'Sending...',\n      send: 'Send',\n"
     "      loading: 'Loading...',\n      noConversations: 'No conversations',\n      conversation: 'Conversation',\n"
     "      noMessages: 'No messages',\n      viewProduct: 'View Product',\n      closeConversation: 'Close',\n"
     "      conversationClosed: 'Conversation closed',\n      messagePlaceholder: 'Type a message...',\n"
     "      selectConversation: 'Select a conversation or start a new one',\n"
     "      startNewConversation: 'New Conversation',\n"
     "    },\n    nav: {"),
]
patch('i18n/en.ts', en_edits)
